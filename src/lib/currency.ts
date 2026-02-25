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

