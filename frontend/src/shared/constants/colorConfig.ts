export interface FashionColor {
  name: string;
  hex: string;
  isPopular?: boolean;
}

export const PRESET_FASHION_COLORS: FashionColor[] = [
  { name: 'Đen Huyền Bí', hex: '#18181B', isPopular: true },
  { name: 'Xanh Navy', hex: '#1B2A4A', isPopular: true },
  { name: 'Trắng Sữa Tinh Khôi', hex: '#F8FAFC', isPopular: true },
  { name: 'Đỏ Burgundy', hex: '#5C1D24', isPopular: true },
  { name: 'Xanh Indigo Cổ Điển', hex: '#243B55', isPopular: true },
  { name: 'Xám Ghi Tro', hex: '#4B5563', isPopular: true },
  { name: 'Nâu Cà Phê Latte', hex: '#8B5A2B' },
  { name: 'Xanh Lá Xô Thơm Sage', hex: '#627B66' },
  { name: 'Xanh Lam Pastel', hex: '#BFDBFE' },
  { name: 'Tím Khói Lavender', hex: '#967BB6' },
  { name: 'Xanh Cổ Vịt Teal', hex: '#1A535C' },
  { name: 'Đen Than Chì', hex: '#262626' },
  { name: 'Be Cát Ấm', hex: '#E5D9C5' }
];

export const COLOR_NAME_TO_HEX: Record<string, string> = {
  ...Object.fromEntries(PRESET_FASHION_COLORS.map(c => [c.name.toLowerCase(), c.hex])),
  'đen': '#18181B',
  'den': '#18181B',
  'trắng': '#F8FAFC',
  'trang': '#F8FAFC',
  'trắng sữa': '#F8FAFC',
  'đỏ': '#991B1B',
  'do': '#991B1B',
  'burgundy': '#5C1D24',
  'navy': '#1B2A4A',
  'xanh navy': '#1B2A4A',
  'xanh đen': '#1B2A4A',
  'xám': '#4B5563',
  'xam': '#4B5563',
  'xám ghi': '#4B5563',
  'nâu': '#8B5A2B',
  'nau': '#8B5A2B',
  'xanh rêu': '#1E3A2F',
  'xanh lá': '#15803D',
  'vàng': '#EAB308',
  'hồng': '#EC4899',
  'tím': '#8B5CF6'
};

export const getColorHex = (colorName?: string, fallback = '#333333'): string => {
  if (!colorName || !colorName.trim()) return fallback;
  const normalized = colorName.trim().toLowerCase();
  if (COLOR_NAME_TO_HEX[normalized]) {
    return COLOR_NAME_TO_HEX[normalized];
  }
  for (const [key, hex] of Object.entries(COLOR_NAME_TO_HEX)) {
    if (normalized.includes(key) || key.includes(normalized)) {
      return hex;
    }
  }
  return fallback;
};
