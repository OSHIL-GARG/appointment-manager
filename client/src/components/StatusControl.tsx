import { STATUSES, type Status } from '../types';

interface Props {
  name: string;
  value: Status;
  onChange: (s: Status) => void;
  label: string;
  size?: 'sm' | 'md';
  describedBy?: string;
}

// Segmented control on native radios: arrow keys and screen readers work without extra code.
export default function StatusControl({ name, value, onChange, label, size = 'md', describedBy }: Props) {
  return (
    <div className={`seg seg-${size}`} role="radiogroup" aria-label={label} aria-describedby={describedBy}>
      {STATUSES.map((s) => (
        <label key={s} className={`seg-item ${s.toLowerCase()}${value === s ? ' on' : ''}`}>
          <input type="radio" name={name} value={s} checked={value === s} onChange={() => onChange(s)} />
          <span>{s}</span>
        </label>
      ))}
    </div>
  );
}
