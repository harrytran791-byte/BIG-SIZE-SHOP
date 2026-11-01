/**
 * Utility functions for formatting money and currency inputs
 */

/**
 * Format a raw numeric string or number to dot-separated Vietnamese currency format (e.g. 10.000, 100.000, 1.000.000)
 * IMPORTANT: If input is empty or 0, returns '' so it NEVER shows '0.000' or '0' in empty input fields!
 */
export const formatCurrencyInput = (value: string | number | undefined | null): string => {
  if (value === undefined || value === null || value === '') return '';
  const clean = String(value).replace(/[^0-9]/g, '');
  if (!clean || clean === '0') return '';
  const num = parseInt(clean, 10);
  if (isNaN(num) || num === 0) return '';
  return num.toLocaleString('vi-VN');
};

/**
 * Strips all non-digit characters from an input string to get clean raw number string
 */
export const parseCurrencyInput = (formattedStr: string): string => {
  return formattedStr.replace(/[^0-9]/g, '');
};

/**
 * Format price for display with currency symbol (e.g. 450.000₫)
 */
export const formatPriceVND = (amount: number | undefined | null): string => {
  if (amount === undefined || amount === null) return '0₫';
  return `${amount.toLocaleString('vi-VN')}₫`;
};
