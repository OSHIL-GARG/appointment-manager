import { FILTERS, type Stats, type StatusFilter } from '../types';

interface Props {
  value: StatusFilter;
  counts: Stats;
  onChange: (f: StatusFilter) => void;
}

export default function FilterTabs({ value, counts, onChange }: Props) {
  return (
    <div className="filters" role="group" aria-label="Filter by status">
      {FILTERS.map((f) => (
        <button key={f} type="button" className={`filter ${f.toLowerCase()}${value === f ? ' on' : ''}`} aria-pressed={value === f} onClick={() => onChange(f)}>
          <span className="filter-count">{counts[f]}</span>
          <span className="filter-name">{f}</span>
        </button>
      ))}
    </div>
  );
}
