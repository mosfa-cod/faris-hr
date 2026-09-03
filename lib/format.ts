export const AR_MONTHS = [
  'يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو',
  'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر',
];

export const AR_DAYS = ['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];

export function formatDateAr(dateStr?: string): string {
  if (!dateStr) return '-';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return '-';
  return `${d.getDate()} ${AR_MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}

export function formatDateTimeAr(dateStr?: string): string {
  if (!dateStr) return '-';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return '-';
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  return `${formatDateAr(dateStr)} - ${hh}:${mm}`;
}

export function formatTimeAr(dateStr?: string): string {
  if (!dateStr) return '-';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return '-';
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

export function formatCurrency(n: number): string {
  return new Intl.NumberFormat('ar-EG', { maximumFractionDigits: 2 }).format(n || 0) + ' ج.م';
}

export function formatNumber(n: number): string {
  return new Intl.NumberFormat('ar-EG').format(n || 0);
}

export function daysBetween(start: string, end: string): number {
  const s = new Date(start);
  const e = new Date(end);
  return Math.max(1, Math.round((e.getTime() - s.getTime()) / 86400000) + 1);
}

export function initials(name: string): string {
  return name
    .split(' ')
    .slice(0, 2)
    .map((p) => p[0])
    .join('');
}
