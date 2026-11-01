export function parseVnDate(value?: string): number {
  if (!value) return 0;
  const match = value.trim().match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})(?:\s+(\d{1,2}):(\d{2})(?::(\d{2}))?)?$/);
  if (match) {
    const [, day, month, year, hour = '0', minute = '0', second = '0'] = match;
    // Business dates use Vietnam time regardless of the viewer's system timezone.
    const stamp = Date.parse(`${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}T${hour.padStart(2, '0')}:${minute.padStart(2, '0')}:${second.padStart(2, '0')}+07:00`);
    const date = new Date(stamp + 7 * 3600000);
    return date.getUTCDate() === Number(day) && date.getUTCMonth() + 1 === Number(month) ? stamp : 0;
  }
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

export function vietnamDateKey(stamp: number): string {
  return new Date(stamp + 7 * 3600000).toISOString().slice(0, 10);
}

export function isInReportPeriod(value: string | undefined, period: string, now = Date.now()): boolean {
  const stamp = parseVnDate(value);
  if (!stamp || stamp > now) return false;
  if (period === 'all') return true;
  if (period === 'quarter' || period === 'year') {
    const date = new Date(stamp + 7 * 3600000), current = new Date(now + 7 * 3600000);
    return date.getUTCFullYear() === current.getUTCFullYear()
      && (period === 'year' || Math.floor(date.getUTCMonth() / 3) === Math.floor(current.getUTCMonth() / 3));
  }
  const days = period === 'today' ? 1 : period === '7_days' ? 7 : 30;
  return now - stamp <= days * 86400000;
}
