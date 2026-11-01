// Recognize explicit ward prefixes from the right; street detail can contain commas.
function parseShippingAddress(raw) {
  const parts = String(raw || '').split(',').map(s => s.trim()).filter(Boolean);
  const isWard = value => /^(phường|xã|thị trấn|p\.?|tt\.?)\s+/iu.test(value || '');
  if (parts.length >= 4 && isWard(parts.at(-3))) return { addressDetail: parts.slice(0, -3).join(', '), ward: parts.at(-3), district: parts.at(-2), province: parts.at(-1) };
  if (parts.length >= 3 && isWard(parts.at(-2))) return { addressDetail: parts.slice(0, -2).join(', '), ward: parts.at(-2), district: '', province: parts.at(-1) };
  // Free-text forms also accept ward names without their administrative prefix.
  const isDistrict = value => /^(quận|huyện|thành phố|thị xã|quan|huyen|thanh pho|thi xa|q\.?|h\.?|tp\.?|tx\.?)\s+/iu.test(value || '');
  if (parts.length >= 4 && isDistrict(parts.at(-2))) return { addressDetail: parts.slice(0, -3).join(', '), ward: parts.at(-3), district: parts.at(-2), province: parts.at(-1) };
  if (parts.length === 3 && !isDistrict(parts.at(-2))) return { addressDetail: parts[0], ward: parts[1], district: '', province: parts[2] };
  return { addressDetail: String(raw || ''), ward: '', district: '', province: '' };
}
module.exports = { parseShippingAddress };
