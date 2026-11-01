export function parseShippingAddress(raw: string) {
  const parts = (raw || '').split(',').map(s => s.trim()).filter(Boolean);
  const isWard = (value: string | undefined) => /^(phường|xã|thị trấn|p\.?|tt\.?)\s+/iu.test(value || '');
  if (parts.length >= 4 && isWard(parts[parts.length - 3])) return { addressDetail: parts.slice(0, -3).join(', '), ward: parts[parts.length - 3], district: parts[parts.length - 2], province: parts[parts.length - 1] };
  if (parts.length >= 3 && isWard(parts[parts.length - 2])) return { addressDetail: parts.slice(0, -2).join(', '), ward: parts[parts.length - 2], district: '', province: parts[parts.length - 1] };
  const isDistrict = (value: string | undefined) => /^(quận|huyện|thành phố|thị xã|quan|huyen|thanh pho|thi xa|q\.?|h\.?|tp\.?|tx\.?)\s+/iu.test(value || '');
  if (parts.length >= 4 && isDistrict(parts[parts.length - 2])) return { addressDetail: parts.slice(0, -3).join(', '), ward: parts[parts.length - 3], district: parts[parts.length - 2], province: parts[parts.length - 1] };
  if (parts.length === 3 && !isDistrict(parts[1])) return { addressDetail: parts[0], ward: parts[1], district: '', province: parts[2] };
  return { addressDetail: raw || '', ward: '', district: '', province: '' };
}
