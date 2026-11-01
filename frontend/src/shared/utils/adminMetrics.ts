// Calendar-day buckets in the shop's timezone; unknown dates never become invented registrations.
export function registrationBuckets(users: { createdAt?: string }[], days: number, now = new Date()) {
  const dayKey = (date: Date) => new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Ho_Chi_Minh', year: 'numeric', month: '2-digit', day: '2-digit' }).format(date);
  const dayNumber = (key: string) => Date.parse(`${key}T00:00:00Z`) / 86400000;
  const today = dayNumber(dayKey(now));
  const start = today - days + 1;
  const label = (day: number) => new Date(day * 86400000).toLocaleDateString('vi-VN', { timeZone: 'UTC', day: '2-digit', month: '2-digit' });
  return Array.from({ length: 4 }, (_, i) => {
    const from = start + Math.floor(i * days / 4);
    const until = start + Math.floor((i + 1) * days / 4);
    const count = users.filter(u => {
      if (!u.createdAt) return false;
      const date = new Date(/^\d{4}-\d{2}-\d{2}$/.test(u.createdAt) ? `${u.createdAt}T00:00:00+07:00` : u.createdAt);
      if (!Number.isFinite(date.getTime())) return false;
      const day = dayNumber(dayKey(date));
      return day >= from && day < until;
    }).length;
    return { count, label: from === until - 1 ? label(from) : `${label(from)}–${label(until - 1)}` };
  });
}
