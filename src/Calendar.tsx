import { useId, useState } from 'react';
import { CalendarDays, ChevronDown, RefreshCw } from 'lucide-react';
import { useApp, useResource } from './state';
import { Sheet, ResourceStatus, Empty } from './ui';
import { calendarDays, monthCells, validDay, type CalendarEvent } from './calendar-data';
import './calendar.css';

const weekdays = ['一', '二', '三', '四', '五', '六', '日'];
function dateLabel(date: string) {
  return new Intl.DateTimeFormat('zh-CN', {
    month: 'long',
    day: 'numeric',
    weekday: 'long',
    timeZone: 'UTC',
  }).format(new Date(`${date}T00:00:00Z`));
}
function EventRow({ event }: { event: CalendarEvent }) {
  const [imageFailed, setImageFailed] = useState(false);
  return (
    <details className="campaign-event">
      <summary aria-label={`活动详情：${event.title}`}>
        <span className="campaign-thumb" aria-hidden="true">
          {event.images[0] && !imageFailed ? (
            <img
              src={event.images[0]}
              alt=""
              loading="lazy"
              referrerPolicy="no-referrer"
              onError={() => setImageFailed(true)}
            />
          ) : (
            <CalendarDays size={25} />
          )}
        </span>
        <span className="campaign-overview">
          <span className="campaign-kind">
            {event.kind}
            {event.price && ` · 活动参考价 ${event.price}`}
          </span>
          <strong>{event.title}</strong>
          <span className="campaign-summary">{event.summary}</span>
        </span>
        <ChevronDown className="campaign-chevron" size={18} aria-hidden="true" />
      </summary>
      <div className="campaign-body">
        {event.content ? (
          <p>{event.content}</p>
        ) : (
          <p className="muted">该活动未提供详细文案，请前往麦当劳官方 App 查看。</p>
        )}
        {event.images.map((src, index) => (
          <img
            className="campaign-poster"
            key={src}
            src={src}
            alt={`${event.title} · 活动海报${index + 1}`}
            loading="lazy"
            referrerPolicy="no-referrer"
            onError={(e) => {
              e.currentTarget.hidden = true;
            }}
          />
        ))}
        <p className="campaign-official-note">
          活动说明与海报来自麦当劳。参加条件及供应以官方 App 为准。
        </p>
      </div>
    </details>
  );
}
export function CalendarSheet({ onClose }: { onClose: () => void }) {
  const app = useApp();
  const clientToday = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Shanghai',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());
  const r = useResource('campaign-calendar');
  const serverDay = r.data?.currentTime?.slice(0, 10);
  const today = validDay(serverDay) ? serverDay : clientToday;
  const month = today.slice(0, 7);
  const [selection, setSelection] = useState(clientToday);
  const [all, setAll] = useState(false);
  const [expanded, setExpanded] = useState(true);
  const selected = selection.startsWith(month) ? selection : today;
  const days = calendarDays(r.data).filter((d) => d.date.startsWith(month));
  const cells = monthCells(month);
  const weekStart = Math.floor(cells.indexOf(selected) / 7) * 7;
  const shownCells = expanded ? cells : cells.slice(weekStart, weekStart + 7);
  const monthLabel = `${Number(month.slice(0, 4))}年${Number(month.slice(5))}月`;
  const counts = new Map(days.map((d) => [d.date, d.events.length]));
  const visible = all
    ? days.filter((d) => d.events.length)
    : days.filter((d) => d.date === selected && d.events.length);
  const total = days.reduce((sum, d) => sum + d.events.length, 0);
  const helpId = useId();
  return (
    <Sheet title="快乐活动日历" onClose={onClose} wide>
      <div className="campaign-calendar">
        <div className="campaign-toolbar">
          <span className="campaign-source">
            {app.session?.mode === 'demo' ? '演示活动' : '麦当劳活动'} · 当月日历
          </span>
          <button className="icon-button" aria-label="刷新活动日历" onClick={r.reload}>
            <RefreshCw size={19} />
          </button>
        </div>
        <ResourceStatus resource={{ ...r, loading: r.loading || (!r.data && !r.error) }}>
          <div className="campaign-layout">
            <section className="campaign-month" aria-label="选择活动日期">
              <div className="campaign-month-title">
                <button
                  className="campaign-month-toggle"
                  aria-label={expanded ? '收起月历' : '展开月历'}
                  aria-expanded={expanded}
                  onClick={() => setExpanded((value) => !value)}
                >
                  <span>{monthLabel}</span>
                  <ChevronDown size={17} className={expanded ? 'expanded' : ''} />
                </button>
                <button
                  onClick={() => {
                    setSelection(today);
                    setAll(false);
                  }}
                >
                  今天
                </button>
              </div>
              <div className="campaign-weekdays" aria-hidden="true">
                {weekdays.map((w) => (
                  <span key={w}>{w}</span>
                ))}
              </div>
              <div
                className="campaign-month-grid"
                role="group"
                aria-label={`${monthLabel}活动日期`}
                aria-describedby={helpId}
              >
                {shownCells.map((date, index) =>
                  date ? (
                    <button
                      key={date}
                      type="button"
                      className={`campaign-day ${date === selected && !all ? 'selected' : ''} ${date === today ? 'today' : ''}`}
                      aria-label={`${dateLabel(date)}${date === today ? '，今天' : ''}，${counts.get(date) ?? 0}条活动`}
                      aria-pressed={!all && date === selected}
                      aria-current={date === today ? 'date' : undefined}
                      tabIndex={date === selected ? 0 : -1}
                      onClick={() => {
                        setSelection(date);
                        setAll(false);
                      }}
                      onKeyDown={(e) => {
                        const delta: Record<string, number> = {
                          ArrowLeft: -1,
                          ArrowRight: 1,
                          ArrowUp: -7,
                          ArrowDown: 7,
                        };
                        if (!(e.key in delta)) return;
                        e.preventDefault();
                        const target = cells[cells.indexOf(date) + delta[e.key]];
                        if (target) {
                          setSelection(target);
                          setAll(false);
                          e.currentTarget.parentElement
                            ?.querySelector<HTMLButtonElement>(`[data-date="${target}"]`)
                            ?.focus();
                        }
                      }}
                      data-date={date}
                    >
                      <span className="campaign-day-number">{Number(date.slice(8))}</span>
                      <span
                        className={`campaign-day-dot ${(counts.get(date) ?? 0) > 0 ? 'has-events' : ''}`}
                        aria-hidden="true"
                      />
                    </button>
                  ) : (
                    <span key={`blank-${index}`} aria-hidden="true" />
                  ),
                )}
              </div>
              <p id={helpId} className="campaign-legend">
                <span aria-hidden="true" />
                圆点表示有活动；方向键可切换日期。
              </p>
            </section>
            <section className="campaign-agenda" aria-label="活动列表">
              <div className="campaign-scope" role="group" aria-label="活动显示范围">
                <button
                  aria-pressed={!all}
                  className={!all ? 'selected' : ''}
                  onClick={() => setAll(false)}
                >
                  所选日期
                </button>
                <button
                  aria-pressed={all}
                  className={all ? 'selected' : ''}
                  onClick={() => setAll(true)}
                >
                  本月全部
                </button>
              </div>
              <div className="campaign-agenda-title" aria-live="polite">
                <h3>{all ? '本月活动' : dateLabel(selected)}</h3>
                <span>{all ? total : (counts.get(selected) ?? 0)} 条活动</span>
              </div>
              {visible.length ? (
                <div className="campaign-day-groups">
                  {visible.map((day) => (
                    <section key={day.date} className="campaign-day-group">
                      {all && (
                        <h4>
                          {dateLabel(day.date)}
                          {day.date === today && <span>今天</span>}
                        </h4>
                      )}
                      <div className="campaign-events">
                        {day.events.map((event) => (
                          <EventRow key={event.id} event={event} />
                        ))}
                      </div>
                    </section>
                  ))}
                </div>
              ) : (
                <Empty
                  title={all ? '本月暂未发布活动' : '这一天暂未发布活动'}
                  text="可以选择有圆点的日期，或查看本月全部活动。"
                />
              )}
            </section>
          </div>
        </ResourceStatus>
        <p className="campaign-footer">
          {app.session?.mode === 'demo'
            ? '当前展示演示内容。'
            : '当前展示真实 MCP 返回的当月活动。'}
          日期表示活动在日历中的归属，不代表仅当天有效。
        </p>
      </div>
    </Sheet>
  );
}
