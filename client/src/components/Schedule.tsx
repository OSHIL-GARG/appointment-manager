import type { Appointment, Status } from '../types';
import { formatDay, groupByDay } from '../utils/date';
import AppointmentRow from './AppointmentRow';

export function ScheduleSkeleton() {
  return (
    <ul className="skeleton" aria-hidden="true">
      {[0, 1, 2].map((i) => <li key={i} />)}
    </ul>
  );
}

interface Props {
  items: Appointment[];
  query: string;
  busy: boolean;
  onStatusChange: (item: Appointment, next: Status) => void;
  onEdit: (item: Appointment) => void;
  onDelete: (item: Appointment) => void;
}

export default function Schedule({ items, query, busy, onStatusChange, onEdit, onDelete }: Props) {
  let index = 0;
  return (
    <div className="schedule" aria-busy={busy}>
      {groupByDay(items).map((g) => {
        const { label, relative } = formatDay(g.key);
        return (
          <section key={g.key} className="day" aria-labelledby={`day-${g.key}`}>
            <h3 className="day-head" id={`day-${g.key}`}>
              {label}
              {relative && <span className="day-rel">{relative}</span>}
              <span className="day-n">{g.items.length} {g.items.length === 1 ? 'appointment' : 'appointments'}</span>
            </h3>
            <ul className="day-list">
              {g.items.map((a) => (
                <AppointmentRow key={a.id} item={a} query={query} index={index++} onStatusChange={onStatusChange} onEdit={onEdit} onDelete={onDelete} />
              ))}
            </ul>
          </section>
        );
      })}
    </div>
  );
}
