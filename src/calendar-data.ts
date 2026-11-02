import { safeUrl, type Bag } from '../shared/domain';

export type CalendarEvent = {
  id: string;
  title: string;
  summary: string;
  content: string;
  images: string[];
  kind: string;
  price?: string;
};
export type CalendarDay = { date: string; events: CalendarEvent[] };
const text = (v: unknown) => (typeof v === 'string' ? v.trim() : '');
export function validDay(value: unknown): value is string {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const d = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(d.valueOf()) && d.toISOString().slice(0, 10) === value;
}
export function calendarDays(raw: Bag | null): CalendarDay[] {
  const grouped = new Map<string, CalendarEvent[]>();
  for (const day of Array.isArray(raw?.dailyList) ? raw.dailyList : []) {
    if (!validDay(day?.date)) continue;
    const events = grouped.get(day.date) ?? [];
    for (const [index, event] of (Array.isArray(day.events) ? day.events : []).entries()) {
      if (!event || typeof event !== 'object') continue;
      const article = event.articleDto ?? {};
      const title = text(article.title) || text(event.activityTitle) || '麦麦活动';
      const content = text(article.content) || text(event.activitySubTitle);
      const summary =
        text(article.highlights) ||
        text(event.activitySubTitle) ||
        content.split(/\r?\n/)[0] ||
        '查看活动详情';
      const urls = [
        ...(Array.isArray(article.imgList) ? article.imgList : []),
        event.activityBgImg,
        event.couponImage,
      ];
      const images = [...new Set(urls.map(safeUrl).filter((u): u is string => Boolean(u)))];
      const kinds: Record<number, string> = {
        0: '活动',
        1: '即将揭晓',
        2: '优惠券',
        3: '品鉴会',
        4: '活动资讯',
        5: '麦麦省',
        6: '派对',
      };
      const price =
        typeof event.price === 'string' &&
        /^\d+(\.\d+)?$/.test(event.price) &&
        Number(event.price) > 0
          ? `¥${event.price}${text(event.priceSuffix)}`
          : undefined;
      const id = `${day.date}:${text(event.activityCode) || text(event.resourceId) || index}`;
      if (!events.some((e) => e.id === id))
        events.push({
          id,
          title,
          summary,
          content,
          images,
          kind: kinds[event.eventType] ?? '活动',
          price,
        });
    }
    grouped.set(day.date, events);
  }
  return [...grouped]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, events]) => ({ date, events }));
}
export function monthCells(month: string): Array<string | null> {
  const first = `${month}-01`;
  if (!validDay(first)) return [];
  const d = new Date(`${first}T00:00:00Z`);
  const offset = (d.getUTCDay() + 6) % 7;
  const count = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0)).getUTCDate();
  const cells: Array<string | null> = Array.from({ length: offset }, () => null);
  for (let i = 1; i <= count; i++) cells.push(`${month}-${String(i).padStart(2, '0')}`);
  while (cells.length % 7) cells.push(null);
  return cells;
}
