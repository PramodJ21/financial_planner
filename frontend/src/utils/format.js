/**
 * Format a number as full Indian currency (en-IN locale).
 * Use in tables and detailed breakdowns.
 * formatINR(1500000) → "15,00,000"
 */
export function formatINR(value) {
  if (value === null || value === undefined || value === '') return '';
  const num = Number(value);
  if (isNaN(num)) return value;
  return num.toLocaleString('en-IN');
}

/**
 * Format a number as abbreviated Indian currency (Cr / L / K).
 * Use in KPI cards and summary stats.
 * formatINRShort(1500000) → "₹15.0L"
 * formatINRShort(10000000) → "₹1.0Cr"
 */
export function formatINRShort(value) {
  const num = Number(value);
  if (isNaN(num)) return '₹0';
  if (num >= 10000000) return `₹${(num / 10000000).toFixed(1)}Cr`;
  if (num >= 100000) return `₹${(num / 100000).toFixed(1)}L`;
  if (num >= 1000) return `₹${(num / 1000).toFixed(1)}K`;
  return `₹${num.toLocaleString('en-IN')}`;
}
