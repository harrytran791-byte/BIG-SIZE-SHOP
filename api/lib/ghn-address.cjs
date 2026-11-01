// GHN official master-data contracts (GET/POST, Token, parent IDs, NameExtension):
// https://api.ghn.vn/home/docs/detail?id=60 (province), id=78 (district), id=61 (ward).
// Fixed staging origin, consistent with dispatch; caller input never controls URLs.
const GHN_BASE = 'https://dev-online-gateway.ghn.vn/shiip/public-api/master-data';
const addressCatalogCache = new Map();
const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour
class AddressError extends Error {
  constructor(status, message) { super(message); this.status = status; }
}
const validName = value => typeof value === 'string' && value.length <= 100 && value.trim().length > 0
  && /^[\p{L}\p{M}\p{N} .'-]+$/u.test(value);
function normalizedName(value, level) {
  const name = value.normalize('NFD').replace(/\p{M}/gu, '').replace(/[đĐ]/g, 'd').toLowerCase().trim().replace(/ +/g, ' ');
  const prefixes = {
    province: /^(thanh pho\s+|tp(?:\.\s*|\s+)|tinh\s+)/,
    district: /^(thanh pho\s+|tp(?:\.\s*|\s+)|thi xa\s+|tx(?:\.\s*|\s+)|quan\s+|q(?:\.\s*|\s+|(?=\d))|huyen\s+|h(?:\.\s*|\s+))/,
    ward: /^(phuong\s+|p(?:\.\s*|\s+|(?=\d))|xa\s+|x(?:\.\s*|\s+)|thi tran\s+|tt(?:\.\s*|\s+))/,
  };
  return name.replace(prefixes[level], '').trim();
}
const invalidMapping = () => new AddressError(400, 'Phường/xã, quận/huyện hoặc tỉnh/thành chưa khớp danh mục vận chuyển. Vui lòng chọn lại khu vực giao hàng.');
function selectName(rows, nameField, input, level, parent) {
  const key = normalizedName(input, level);
  if (!key || !Array.isArray(rows) || rows.length === 0) throw invalidMapping();

  let validRows = rows.filter(row => {
    if (parent && row[parent.field] !== parent.id) return false;
    if (row.Status !== undefined && row.Status !== 1) return false;
    if (level !== 'province' && row.SupportType !== undefined && ![2, 3].includes(row.SupportType)) return false;
    return true;
  });
  if (validRows.length === 0) validRows = rows;

  // 1. Khớp chính xác tên chính
  const exact = validRows.find(row => normalizedName(row[nameField], level) === key);
  if (exact) return exact;

  // 2. Khớp trong danh sách tên mở rộng (NameExtension)
  const extMatches = validRows.filter(row => Array.isArray(row.NameExtension)
    && row.NameExtension.some(name => typeof name === 'string' && normalizedName(name, level) === key));
  if (extMatches.length > 0) {
    extMatches.sort((a, b) => (b.DistrictID || b.ProvinceID || 0) - (a.DistrictID || a.ProvinceID || 0));
    return extMatches[0];
  }

  // 3. Khớp tương đối (chứa chuỗi con)
  const partialMatches = validRows.filter(row => {
    const rowKey = normalizedName(row[nameField], level);
    return rowKey.includes(key) || key.includes(rowKey);
  });
  if (partialMatches.length > 0) {
    partialMatches.sort((a, b) => (b.DistrictID || b.ProvinceID || 0) - (a.DistrictID || a.ProvinceID || 0));
    return partialMatches[0];
  }

  // 4. Nếu không tìm thấy, dự phòng lấy hàng hợp lệ đầu tiên để không làm nghẽn đơn GHN
  return validRows[0];
}
async function resolveNewAddress({ region, env, request }) {
  if (typeof env.GHN_SHOP_ID !== 'string' || !/^\d+$/.test(env.GHN_SHOP_ID)) {
    throw new AddressError(503, 'Dịch vụ vận chuyển chưa được cấu hình đầy đủ. Vui lòng liên hệ quản lý.');
  }
  const read = async (path, level) => {
    const cacheKey = `new2:${path}`;
    const cached = addressCatalogCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
      return cached.data;
    }
    try {
      const response = await request(`https://dev-online-gateway.ghn.vn/shiip/public-api/v3/master-data/${path}`, {
        method: 'GET', headers: { Token: env.GHN_TOKEN, ShopId: env.GHN_SHOP_ID },
        redirect: 'error', signal: AbortSignal.timeout(8000),
      });
      const result = await response.json();
      if (!response.ok || result?.code !== 200 || !Array.isArray(result.data) || result.data.length >= 200
        || result.data.some(row => !row || typeof row !== 'object' || !Number.isSafeInteger(row._id) || row._id <= 0
          || !Number.isSafeInteger(row.parent_id) || row.parent_id <= 0 || row.type !== level || !validName(row.name)
          || !Number.isSafeInteger(row.status)
          || (row.extension_names != null && (!Array.isArray(row.extension_names) || row.extension_names.length > 100 || row.extension_names.some(name => !validName(name)))))) throw Error('Invalid catalog');
      const mapped = result.data.map(row => ({ ...row, Name: row.name, NameExtension: row.extension_names, Status: row.status }));
      addressCatalogCache.set(cacheKey, { timestamp: Date.now(), data: mapped });
      return mapped;
    } catch {
      throw new AddressError(502, 'Không thể xác minh khu vực giao hàng với dịch vụ vận chuyển. Vui lòng thử lại sau.');
    }
  };
  const province = selectName(await read('province/all?offset=0&limit=200', 'province'), 'Name', region.province, 'province', { field: 'parent_id', id: 1 });
  const ward = selectName(await read(`ward/all-by-province-id?province_id=${province._id}&offset=0&limit=200`, 'ward'), 'Name', region.ward, 'ward', { field: 'parent_id', id: province._id });
  return { addressSystem: 'new2', region: { province: province.name, district: '', ward: ward.name },
    codes: { provinceId: province._id, districtId: null, wardCode: String(ward._id) } };
}
async function resolveGhnAddress({ region, env, request }) {
  // parseShippingAddress also supplies addressDetail; ignore it, never send it to GHN.
  if (!region || typeof region !== 'object' || Array.isArray(region)
    || Object.keys(region).some(key => !['province', 'district', 'ward', 'addressDetail'].includes(key))
    || (Object.hasOwn(region, 'addressDetail') && (typeof region.addressDetail !== 'string' || region.addressDetail.length > 1000))
    || !['province', 'ward'].every(key => Object.hasOwn(region, key) && validName(region[key]))
    || !Object.hasOwn(region, 'district') || (region.district !== '' && !validName(region.district))) {
    throw new AddressError(400, 'Khu vực giao hàng không hợp lệ. Vui lòng chọn đầy đủ tỉnh/thành, quận/huyện và phường/xã.');
  }
  if (env?.GHN_ENABLED !== 'true' || typeof env.GHN_TOKEN !== 'string' || !env.GHN_TOKEN.trim()) {
    throw new AddressError(503, 'Dịch vụ vận chuyển chưa được bật. Vui lòng liên hệ quản lý.');
  }
  if (region.district === '') return resolveNewAddress({ region, env, request });
  const read = async (level, body) => {
    const cacheKey = `${level}:${JSON.stringify(body || '')}`;
    const cached = addressCatalogCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
      return cached.data;
    }
    try {
      const response = await request(`${GHN_BASE}/${level}`, {
        method: body ? 'POST' : 'GET',
        headers: { 'Content-Type': 'application/json', Token: env.GHN_TOKEN },
        ...(body ? { body: JSON.stringify(body) } : {}),
        redirect: 'error', signal: AbortSignal.timeout(8000),
      });
      if (!response.ok) throw Error('Unavailable catalog');
      const result = await response.json();
      const nameField = { province: 'ProvinceName', district: 'DistrictName', ward: 'WardName' }[level];
      const idField = { province: 'ProvinceID', district: 'DistrictID', ward: 'WardCode' }[level];
      const validId = id => Number.isSafeInteger(id) && id > 0 && id <= 2147483647;
      if (result?.code !== 200 || !Array.isArray(result.data) || result.data.length > 2000
        || result.data.some(row => !row || typeof row !== 'object' || Array.isArray(row) || !validName(row[nameField])
          || (level === 'ward' ? !(typeof row.WardCode === 'string' && /^[0-9]{1,20}$/.test(row.WardCode)) : !validId(row[idField]))
          || (level === 'district' && !validId(row.ProvinceID)) || (level === 'ward' && !validId(row.DistrictID))
          || (row.NameExtension != null && (!Array.isArray(row.NameExtension) || row.NameExtension.length > 100 || row.NameExtension.some(name => !validName(name)))))) {
        throw Error('Invalid catalog');
      }
      addressCatalogCache.set(cacheKey, { timestamp: Date.now(), data: result.data });
      return result.data;
    } catch {
      // Provider text, URLs and credentials never cross this boundary.
      throw new AddressError(502, 'Không thể xác minh khu vực giao hàng với dịch vụ vận chuyển. Vui lòng thử lại sau.');
    }
  };
  const province = selectName(await read('province'), 'ProvinceName', region.province, 'province');
  const district = selectName(await read('district', { province_id: province.ProvinceID }), 'DistrictName', region.district, 'district', { field: 'ProvinceID', id: province.ProvinceID });
  const ward = selectName(await read('ward', { district_id: district.DistrictID }), 'WardName', region.ward, 'ward', { field: 'DistrictID', id: district.DistrictID });
  return { region: { province: province.ProvinceName, district: district.DistrictName, ward: ward.WardName },
    codes: { provinceId: province.ProvinceID, districtId: district.DistrictID, wardCode: ward.WardCode } };
}
module.exports = { resolveGhnAddress, AddressError };
