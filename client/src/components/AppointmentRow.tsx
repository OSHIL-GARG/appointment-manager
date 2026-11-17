import type { Appointment, Status } from '../types';
import { formatTime } from '../utils/date';
import { EditIcon, TrashIcon } from './Icons';
import Highlight from './Highlight';
import StatusControl from './StatusControl';

interface Props {
  item: Appointment;
  query: string;
  index: number;
  onStatusChange: (item: Appointment, next: Status) => void;
  onEdit: (item: Appointment) => void;
  onDelete: (item: Appointment) => void;
}

export default function AppointmentRow({ item, query, index, onStatusChange, onEdit, onDelete }: Props) {
  const { clock, suffix } = formatTime(item.dateTime);
  return (
    <li className={`appt ${item.status.toLowerCase()}`} style={{ ['--i' as string]: Math.min(index, 8) }}>
      <div className="appt-time">
        <span className="clock">{clock}</span>
        <span className="suffix">{suffix}</span>
      </div>
      <span className="appt-dot" aria-hidden="true" />
      <article className="appt-card" aria-label={`${item.customerName}, ${item.service}, ${item.status}`}>
        <div className="appt-main">
          <h4 className="appt-name"><Highlight text={item.customerName} query={query} /></h4>
          <p className="appt-service">{item.service}</p>
        </div>
        <div className="appt-actions">
          <button type="button" className="icon-btn" onClick={() => onEdit(item)} aria-label={`Edit ${item.customerName}`}><EditIcon /></button>
          <button type="button" className="icon-btn danger" onClick={() => onDelete(item)} aria-label={`Delete ${item.customerName}`}><TrashIcon /></button>
        </div>
        <StatusControl name={`status-${item.id}`} label={`Status for ${item.customerName}`} value={item.status} size="sm" onChange={(next) => onStatusChange(item, next)} />
      </article>
    </li>
  );
}
