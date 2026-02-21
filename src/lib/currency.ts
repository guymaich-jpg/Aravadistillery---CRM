// Currency formatting — Israeli Shekel (ILS / ₪)

const ILS_FORMATTER = new Intl.NumberFormat('he-IL', {
  style: 'currency',
  currency: 'ILS',
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
});

export function formatCurrency(amount: number): string {
  return ILS_FORMATTER.format(amount);
}

export function formatCurrencyCompact(amount: number): string {
  if (amount >= 1_000_000) {
    return `₪${(amount / 1_000_000).toFixed(1)}M`;
  }
  if (amount >= 1_000) {
    return `₪${(amount / 1_000).toFixed(1)}K`;
  }
  return formatCurrency(amount);
}

export const CURRENCY_SYMBOL = '₪';
