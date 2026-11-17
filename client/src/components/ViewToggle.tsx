import type { View } from '../types';
import { ListIcon, WeekIcon } from './Icons';

export default function ViewToggle({ value, onChange }: { value: View; onChange: (v: View) => void }) {
  return (
    <div className="view-toggle" role="group" aria-label="Choose view">
      <button type="button" aria-pressed={value === 'list'} className={value === 'list' ? 'on' : ''} onClick={() => onChange('list')}>
        <ListIcon /> List
      </button>
      <button type="button" aria-pressed={value === 'week'} className={value === 'week' ? 'on' : ''} onClick={() => onChange('week')}>
        <WeekIcon /> Week
      </button>
    </div>
  );
}
