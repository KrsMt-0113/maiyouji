import { describe, it, expect } from 'vitest';
import { calendarDays, monthCells, validDay } from '../src/calendar-data';

describe('real campaign calendar contracts', () => {
  it('handles article media and highlights without interpreting server markup or zero price as free', () => {
    const days = calendarDays({
      dailyList: [
        {
          date: '2026-11-02',
          events: [
            {
              activityCode: 'a',
              eventType: 4,
              price: '0',
              articleDto: {
                title: '海陆双全堡',
                content: '第一行\n第二行',
                highlights: '一堡双重享受',
                imgList: [
                  'https://cms-cdn.mcd.cn/a.png',
                  'javascript:alert(1)',
                  'https://cms-cdn.mcd.cn/a.png',
                ],
              },
            },
          ],
        },
      ],
    });
    expect(days[0].events[0]).toMatchObject({
      title: '海陆双全堡',
      summary: '一堡双重享受',
      content: '第一行\n第二行',
      kind: '活动资讯',
      images: ['https://cms-cdn.mcd.cn/a.png'],
    });
    expect(days[0].events[0].price).toBeUndefined();
  });
  it('merges repeated days, deduplicates resource IDs, sorts dates, and tolerates malformed payloads', () => {
    expect(calendarDays(null)).toEqual([]);
    const days = calendarDays({
      dailyList: [
        null,
        { date: '2026-02-30' },
        {
          date: '2026-11-03',
          events: [{ activityCode: 'b', activityTitle: '明日', eventType: 6 }],
        },
        {
          date: '2026-11-02',
          events: [null, { activityCode: 'a', articleDto: { title: '今日' } }],
        },
        { date: '2026-11-02', events: [{ activityCode: 'a', articleDto: { title: '重复' } }] },
      ],
    });
    expect(days.map((d) => [d.date, d.events.length])).toEqual([
      ['2026-11-02', 1],
      ['2026-11-03', 1],
    ]);
    expect(days[1].events[0].kind).toBe('派对');
  });
  it('preserves coupon/banner fallback images and explicit positive reference prices', () => {
    const event = calendarDays({
      dailyList: [
        {
          date: '2026-11-02',
          events: [
            {
              eventType: 2,
              activityTitle: '优惠券',
              activitySubTitle: '活动说明',
              couponImage: 'https://cms-cdn.mcd.cn/c.png',
              price: '9.9',
              priceSuffix: '起',
            },
          ],
        },
      ],
    })[0].events[0];
    expect(event).toMatchObject({
      title: '优惠券',
      summary: '活动说明',
      price: '¥9.9起',
      images: ['https://cms-cdn.mcd.cn/c.png'],
    });
  });
  it('aligns Monday-first month grids across leap years and year boundaries', () => {
    const november = monthCells('2026-11');
    expect(november.slice(0, 6)).toEqual(Array(6).fill(null));
    expect(november[6]).toBe('2026-11-01');
    expect(november).toHaveLength(42);
    expect(monthCells('2028-02').filter(Boolean)).toHaveLength(29);
    expect(monthCells('2026-12').filter(Boolean).at(-1)).toBe('2026-12-31');
    expect(monthCells('2026-13')).toEqual([]);
    expect(validDay('2026-02-30')).toBe(false);
  });
});
