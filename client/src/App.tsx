import { useCallback, useEffect, useMemo, useState } from 'react';
import { useAppointments } from './hooks/useAppointments';
import { useDebounced } from './hooks/useDebounced';
import { useTheme } from './hooks/useTheme';
import { FILTERS, type Appointment, type AppointmentInput, type Status, type StatusFilter, type View } from './types';
import { todayHeading, todayKey, weekStart } from './utils/date';
import AppointmentForm from './components/AppointmentForm';
import FilterTabs from './components/FilterTabs';
import { MoonIcon, SunIcon } from './components/Icons';
import Schedule, { ScheduleSkeleton } from './components/Schedule';
import SearchBox from './components/SearchBox';
import Toast, { type ToastData } from './components/Toast';
import ViewToggle from './components/ViewToggle';
import WeekView from './components/WeekView';

function initialFromUrl(): { status: StatusFilter; search: string; view: View } {
  const p = new URLSearchParams(window.location.search);
  const s = p.get('status') as StatusFilter | null;
  return {
    status: s && FILTERS.includes(s) ? s : 'All',
    search: p.get('q') || '',
    view: p.get('view') === 'week' ? 'week' : 'list',
  };
}

export default function App() {
  const initial = useMemo(initialFromUrl, []);
  const [filter, setFilter] = useState<StatusFilter>(initial.status);
  const [searchInput, setSearchInput] = useState(initial.search);
  const [view, setView] = useState<View>(initial.view);
  const [weekAnchor, setWeekAnchor] = useState<string | null>(null);
  const [editing, setEditing] = useState<Appointment | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [toast, setToast] = useState<ToastData | null>(null);
  const search = useDebounced(searchInput.trim(), 250);
  const { theme, toggle: toggleTheme } = useTheme();
  const dismiss = useCallback(() => setToast(null), []);
  // Names can end in a period ("Alex M."), so normalise to a single trailing period.
  const notify = useCallback((t: ToastData) => setToast({ ...t, message: t.message.replace(/\.+$/, '.') }), []);

  const { items, counts, loading, error, reload, create, update, changeStatus, remove, restore } = useAppointments({ status: filter, search });

  // Keep filter, search and view in the URL so a refresh (or a shared link) restores the same screen.
  useEffect(() => {
    const p = new URLSearchParams();
    if (filter !== 'All') p.set('status', filter);
    if (search) p.set('q', search);
    if (view !== 'list') p.set('view', view);
    const qs = p.toString();
    window.history.replaceState(null, '', qs ? `?${qs}` : window.location.pathname);
  }, [filter, search, view]);

  const closeForm = useCallback(() => {
    setEditing(null);
    setSheetOpen(false);
  }, []);

  useEffect(() => {
    if (!sheetOpen) return undefined;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && closeForm();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [sheetOpen, closeForm]);

  const startEdit = useCallback((item: Appointment) => {
    setEditing(item);
    setSheetOpen(true);
  }, []);

  async function handleSubmit(data: AppointmentInput) {
    if (editing) {
      const saved = await update(editing.id, data);
      notify({ message: `Saved changes to ${saved.customerName}.` });
      closeForm();
      return;
    }
    const created = await create(data);
    const hidden = (filter !== 'All' && created.status !== filter) || (search !== '' && !created.customerName.toLowerCase().includes(search.toLowerCase()));
    notify({ message: hidden ? `Added ${created.customerName}. Hidden by the current filter.` : `Added ${created.customerName}.` });
    setSheetOpen(false);
  }

  async function handleStatus(item: Appointment, next: Status) {
    const res = await changeStatus(item, next);
    if (!res.ok) return notify({ kind: 'error', message: res.error });
    if (res.noop) return undefined;
    const previous = res.prev as Status;
    notify({
      message: `${item.customerName} marked ${next}.`,
      undo: () => void changeStatus({ ...item, status: next }, previous).then(reload),
    });
    return undefined;
  }

  async function handleDelete(item: Appointment) {
    if (editing?.id === item.id) closeForm();
    const res = await remove(item);
    if (!res.ok) return notify({ kind: 'error', message: res.error });
    notify({ message: `Deleted ${item.customerName}.`, undo: () => void restore(item) });
    return undefined;
  }

  const hasFilters = filter !== 'All' || search !== '';
  const firstLoad = loading && items.length === 0 && !error;
  const visibleWeek = weekStart(weekAnchor ?? items[0]?.dateTime.slice(0, 10) ?? todayKey());

  return (
    <div className="app">
      <header className="top">
        <div className="top-inner">
          <div>
            <h1>Appointments</h1>
            <p className="top-sub">{todayHeading()}</p>
          </div>
          <div className="top-actions">
            <button type="button" className="theme-btn" onClick={toggleTheme} aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}>
              {theme === 'dark' ? <SunIcon /> : <MoonIcon />}
            </button>
            <button type="button" className="new-btn" onClick={() => { setEditing(null); setSheetOpen(true); }}>New appointment</button>
          </div>
        </div>
      </header>

      <div className="page">
        <main className="main">
          <div className="toolbar">
            <FilterTabs value={filter} counts={counts} onChange={setFilter} />
            <div className="toolbar-right">
              <SearchBox value={searchInput} onChange={setSearchInput} />
              <ViewToggle value={view} onChange={setView} />
            </div>
          </div>

          {error && (
            <div className="error-box" role="alert">
              {error} <button type="button" className="link" onClick={reload}>Try again</button>
            </div>
          )}

          {firstLoad && <ScheduleSkeleton />}

          {!error && !loading && items.length === 0 && (
            <div className="empty">
              <p className="empty-title">{hasFilters ? 'No appointments match.' : 'No appointments yet.'}</p>
              <p>{hasFilters ? 'Try another status or clear the search.' : 'Add the first one using the form.'}</p>
              {hasFilters && <button type="button" className="ghost" onClick={() => { setFilter('All'); setSearchInput(''); }}>Clear filters</button>}
            </div>
          )}

          {view === 'list' && items.length > 0 && (
            <Schedule items={items} query={search} busy={loading} onStatusChange={handleStatus} onEdit={startEdit} onDelete={handleDelete} />
          )}
          {view === 'week' && !error && (items.length > 0 || !loading) && (
            <WeekView items={items} start={visibleWeek} query={search} onNavigate={setWeekAnchor} onToday={() => setWeekAnchor(weekStart(todayKey()))} onEdit={startEdit} />
          )}
        </main>

        {sheetOpen && <div className="backdrop" onClick={closeForm} aria-hidden="true" />}
        <aside className={`side${sheetOpen ? ' open' : ''}`}>
          <AppointmentForm key={editing?.id ?? 'new'} editing={editing} onSubmit={handleSubmit} onCancel={closeForm} autoFocus={sheetOpen} />
        </aside>
      </div>

      <Toast toast={toast} onDismiss={dismiss} />
    </div>
  );
}
