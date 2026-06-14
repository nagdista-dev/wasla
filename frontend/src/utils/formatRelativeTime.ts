export function formatRelativeTime(
  dateString: string,
  t: (key: string, params?: Record<string, string | number>) => string,
): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSeconds = Math.floor(diffMs / 1000);
  const diffMinutes = Math.floor(diffSeconds / 60);
  const diffHours = Math.floor(diffMinutes / 60);
  const diffDays = Math.floor(diffHours / 24);
  const diffWeeks = Math.floor(diffDays / 7);
  const diffMonths = Math.floor(diffDays / 30);
  const diffYears = Math.floor(diffDays / 365);

  if (diffSeconds < 60) {
    if (diffSeconds <= 5) return t('time.justNow');
    return t('time.secondsAgo', { count: diffSeconds });
  }
  if (diffMinutes < 60) {
    if (diffMinutes === 1) return t('time.minuteAgo');
    return t('time.minutesAgo', { count: diffMinutes });
  }
  if (diffHours < 24) {
    if (diffHours === 1) return t('time.hourAgo');
    return t('time.hoursAgo', { count: diffHours });
  }
  if (diffDays < 7) {
    if (diffDays === 1) return t('time.dayAgo');
    return t('time.daysAgo', { count: diffDays });
  }
  if (diffWeeks < 4) {
    if (diffWeeks === 1) return t('time.weekAgo');
    return t('time.weeksAgo', { count: diffWeeks });
  }
  if (diffMonths < 12) {
    if (diffMonths === 1) return t('time.monthAgo');
    return t('time.monthsAgo', { count: diffMonths });
  }
  if (diffYears === 1) return t('time.yearAgo');
  return t('time.yearsAgo', { count: diffYears });
}
