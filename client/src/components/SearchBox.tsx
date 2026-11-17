import { SearchIcon } from './Icons';

export default function SearchBox({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div className="search">
      <label htmlFor="search" className="sr">Search by customer name</label>
      <SearchIcon />
      <input id="search" type="search" placeholder="Search customer name" value={value} onChange={(e) => onChange(e.target.value)} autoComplete="off" />
    </div>
  );
}
