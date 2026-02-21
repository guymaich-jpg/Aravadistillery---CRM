// Date formatting helpers with Hebrew locale support

const DATE_LONG = new Intl.DateTimeFormat('he-IL', {
  year: 'numeric',
  month: 'long',
  day: 'numeric',
});

const DATE_SHORT = new Intl.DateTimeFormat('he-IL', {
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

const DATE_MONTH_SHORT = new Intl.DateTimeFormat('he-IL', {
  month: 'short',
  year: 'numeric',
});

const MONTH_ABBR = ['ינו׳', 'פבר׳', 'מרץ', 'אפר׳', 'מאי', 'יוני', 'יולי', 'אוג׳', 'ספט׳', 'אוק׳', 'נוב׳', 'דצמ׳'];

export function formatDate(dateStr: string): string {
  if (!dateStr) return '';
  return DATE_LONG.format(new Date(dateStr));
}

export function formatDateShort(dateStr: string): string {
  if (!dateStr) return '';
  return DATE_SHORT.format(new Date(dateStr));
}

export function formatMonthLabel(yearMonth: string): string {
  // yearMonth = "YYYY-MM"
  const [year, month] = yearMonth.split('-').map(Number);
  if (!year || !month) return yearMonth;
  return `${MONTH_ABBR[month - 1]} ${year}`;
}

export function getMonthAbbr(monthIndex: number): string {
  return MONTH_ABBR[monthIndex] ?? '';
}

export function formatRelativeDate(dateStr: string): string {
  if (!dateStr) return '';
  const diff = Date.now() - new Date(dateStr).getTime();
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  if (days === 0) return 'היום';
  if (days === 1) return 'אתמול';
  if (days < 7) return `לפני ${days} ימים`;
  if (days < 30) return `לפני ${Math.floor(days / 7)} שבועות`;
  if (days < 365) return `לפני ${Math.floor(days / 30)} חודשים`;
  return formatDateShort(dateStr);
}

export function toYearMonth(dateStr: string): string {
  return dateStr.slice(0, 7); // "YYYY-MM"
}

export function getPeriodBounds(period: '30d' | '90d' | 'year' | 'all'): { from: Date; to: Date } {
  const to = new Date();
  const from = new Date();
  switch (period) {
    case '30d':
      from.setDate(from.getDate() - 30);
      break;
    case '90d':
      from.setDate(from.getDate() - 90);
      break;
    case 'year':
      from.setFullYear(from.getFullYear() - 1);
      break;
    case 'all':
      from.setFullYear(2000, 0, 1);
      break;
  }
  return { from, to };
}
