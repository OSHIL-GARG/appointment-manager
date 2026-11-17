import type { Appointment } from '../types';
import { addDays, dayName, dayNumber, formatTimeShort, formatWeekRange, todayKey, weekDays } from '../utils/date';
import { ChevronLeft, ChevronRight } from './Icons';
import Highlight from './Highlight';

interface Props {
  items: Appointment[];
  /** Monday of the visible week, "YYYY-MM-DD". */
  start: string;
  query: string;
  onNavigate: (start: string) => void;
  onToday: () => void;
  onEdit: (item: Appointment) => void;
}

export default function WeekView({ items, start, query, onNavigate, onToday, onEdit }: Props) {
  const today = todayKey();
  const days = weekDays(start);
  const inWeek = items.filter((a) => a.dateTime.slice(0, 10) >= days[0] && a.dateTime.slice(0, 10) <= days[6]).length;
  return (
    <section className="week" aria-label="Week calendar">
      <div className="week-bar">
        <div className="week-nav">
          <button type="button" className="icon-btn" aria-label="Previous week" onClick={() => onNavigate(addDays(start, -7))}><ChevronLeft /></button>
          <button type="button" className="icon-btn" aria-label="Next week" onClick={() => onNavigate(addDays(start, 7))}><ChevronRight /></button>
          <button type="button" className="ghost sm" onClick={onToday}>Today</button>
        </div>
        <h3 className="week-range" aria-live="polite">{formatWeekRange(start)}</h3>
        <span className="week-n">{inWeek} {inWeek === 1 ? 'appointment' : 'appointments'}</span>
      </div>
      <div className="week-grid">
        {days.map((key) => {
          const list = items.filter((a) => a.dateTime.startsWith(key));
          return (
            <div key={key} className={`wday${key === today ? ' today' : ''}${list.length === 0 ? ' none' : ''}`}>
              <div className="wday-head">
                <span className="wday-name">{dayName(key)}</span>
                <span className="wday-num">{dayNumber(key)}</span>
              </div>
              <ul className="wday-list">
                {list.map((a) => (
                  <li key={a.id}>
                    <button type="button" className={`chip ${a.status.toLowerCase()}`} onClick={() => onEdit(a)} aria-label={`Edit ${a.customerName}, ${formatTimeShort(a.dateTime)}, ${a.status}`}>
                      <span className="chip-time">{formatTimeShort(a.dateTime)}</span>
                      <span className="chip-name"><Highlight text={a.customerName} query={query} /></span>
                      <span className="chip-meta">{a.service} · {a.status}</span>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          );
        })}
      </div>
    </section>
  );
}
