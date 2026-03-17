/**
 * Shared INR currency formatters.
 * fmt()     → abbreviated (₹1.5Cr, ₹3.2L, ₹5K)
 * fmtFull() → full Intl format (₹1,50,00,000)
 */

export const fmt = (val) => {
    let n = Number(val) || 0;
    let sign = '';
    if (n < 0) {
        sign = '−';
        n = Math.abs(n);
    }
    if (n >= 10000000) return sign + '₹' + (n / 10000000).toFixed(1) + 'Cr';
    if (n >= 100000) return sign + '₹' + (n / 100000).toFixed(1) + 'L';
    if (n >= 1000) return sign + '₹' + (n / 1000).toFixed(1) + 'K';
    return sign + '₹' + n.toLocaleString('en-IN');
};

export const fmtFull = (val) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(val || 0);
