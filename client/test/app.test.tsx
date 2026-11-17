import { render, screen, within, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it } from 'vitest';
import App from '../src/App';
import { installFakeApi } from './fakeApi';
import { addDays, formatTime, groupByDay, highlightParts, weekDays, weekStart } from '../src/utils/date';

beforeEach(() => {
  window.history.replaceState(null, '', '/');
  window.localStorage.clear();
  delete document.documentElement.dataset.theme;
  installFakeApi();
});

const rowFor = (name: string) => screen.getByRole('article', { name: new RegExp(name) });

describe('Appointment Manager UI', () => {
  it('shows the seeded appointments with counts', async () => {
    render(<App />);
    expect(await screen.findByText('Alex Morgan')).toBeInTheDocument();
    expect(screen.getByText('Jamie Lee')).toBeInTheDocument();
    expect(screen.getByText('Taylor Smith')).toBeInTheDocument();
    await waitFor(() => expect(screen.getByRole('button', { name: /All/ })).toHaveTextContent('3'));
  });

  it('shows clear errors when required fields are empty', async () => {
    const user = userEvent.setup();
    render(<App />);
    await screen.findByText('Alex Morgan');
    await user.click(screen.getByRole('button', { name: 'Add appointment' }));
    expect(screen.getByText('Enter the customer name.')).toBeInTheDocument();
    expect(screen.getByText('Enter the service.')).toBeInTheDocument();
    expect(screen.getByText('Choose a date and time.')).toBeInTheDocument();
    expect(screen.getByRole('alert')).toHaveTextContent('Fix 3 fields');
  });

  it('adds an appointment and lists it', async () => {
    const user = userEvent.setup();
    render(<App />);
    await screen.findByText('Alex Morgan');
    await user.type(screen.getByLabelText('Customer name'), 'Sam Rivera');
    await user.type(screen.getByLabelText('Service'), 'Checkup');
    fireEvent.change(screen.getByLabelText('Date and time'), { target: { value: '2026-11-04T09:15' } });
    await user.click(screen.getByRole('button', { name: 'Add appointment' }));
    expect(await screen.findByText('Sam Rivera')).toBeInTheDocument();
    expect(screen.getByText('Added Sam Rivera.')).toBeInTheDocument();
    expect(screen.getByLabelText('Customer name')).toHaveValue('');
  });

  it('changes status, updates counts, and supports undo', async () => {
    const user = userEvent.setup();
    render(<App />);
    await screen.findByText('Alex Morgan');
    await user.click(within(rowFor('Alex Morgan')).getByLabelText('Confirmed'));
    expect(await screen.findByText('Alex Morgan marked Confirmed.')).toBeInTheDocument();
    expect(within(rowFor('Alex Morgan')).getByLabelText('Confirmed')).toBeChecked();
    await waitFor(() => expect(screen.getByRole('button', { name: /Confirmed/ })).toHaveTextContent('2'));
    await user.click(screen.getByRole('button', { name: 'Undo' }));
    await waitFor(() => expect(within(rowFor('Alex Morgan')).getByLabelText('Pending')).toBeChecked());
  });

  it('edits an appointment through the form', async () => {
    const user = userEvent.setup();
    render(<App />);
    await screen.findByText('Alex Morgan');
    await user.click(screen.getByRole('button', { name: 'Edit Alex Morgan' }));
    expect(screen.getByRole('heading', { name: 'Edit appointment' })).toBeInTheDocument();
    const name = screen.getByLabelText('Customer name');
    expect(name).toHaveValue('Alex Morgan');
    await user.clear(name);
    await user.type(name, 'Alex M.');
    await user.click(screen.getByRole('button', { name: 'Save changes' }));
    expect(await screen.findByText('Saved changes to Alex M.')).toBeInTheDocument();
    expect(rowFor('Alex M\\.')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'New appointment' })).toBeInTheDocument();
  });

  it('deletes an appointment and can undo it', async () => {
    const user = userEvent.setup();
    render(<App />);
    await screen.findByText('Taylor Smith');
    await user.click(screen.getByRole('button', { name: 'Delete Taylor Smith' }));
    await waitFor(() => expect(screen.queryByText('Taylor Smith')).not.toBeInTheDocument());
    expect(screen.getByText('Deleted Taylor Smith.')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Undo' }));
    expect(await screen.findByText('Taylor Smith')).toBeInTheDocument();
  });

  it('filters by status', async () => {
    const user = userEvent.setup();
    render(<App />);
    await screen.findByText('Alex Morgan');
    await user.click(screen.getByRole('button', { name: /Cancelled/ }));
    await waitFor(() => expect(screen.queryByText('Alex Morgan')).not.toBeInTheDocument());
    expect(screen.getByText('Taylor Smith')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /All/ }));
    expect(await screen.findByText('Alex Morgan')).toBeInTheDocument();
  });

  it('searches by customer name and combines with the status filter', async () => {
    const user = userEvent.setup();
    render(<App />);
    await screen.findByText('Alex Morgan');
    await user.type(screen.getByLabelText('Search by customer name'), 'JAM');
    await waitFor(() => expect(screen.queryByText('Alex Morgan')).not.toBeInTheDocument());
    expect(rowFor('Jamie Lee')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /Pending/ }));
    expect(await screen.findByText('No appointments match.')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Clear filters' }));
    expect(await screen.findByText('Alex Morgan')).toBeInTheDocument();
  });

  it('restores filter, search and view from the URL (refresh behaviour)', async () => {
    window.history.replaceState(null, '', '/?status=Confirmed&q=jamie');
    render(<App />);
    expect(await screen.findByRole('article', { name: /Jamie Lee/ })).toBeInTheDocument();
    expect(screen.queryByText('Alex Morgan')).not.toBeInTheDocument();
    expect(screen.getByLabelText('Search by customer name')).toHaveValue('jamie');
  });

  it('week view shows the week of the first appointment, navigates, and opens edit from a chip', async () => {
    const user = userEvent.setup();
    render(<App />);
    await screen.findByText('Alex Morgan');
    await user.click(screen.getByRole('button', { name: /Week/ }));
    expect(await screen.findByRole('heading', { name: /2 Nov – 8 Nov 2026/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Edit Jamie Lee, 11:30 AM, Confirmed/ })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Next week' }));
    expect(await screen.findByRole('heading', { name: /9 Nov – 15 Nov 2026/ })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Previous week' }));
    await user.click(await screen.findByRole('button', { name: /Edit Alex Morgan/ }));
    expect(screen.getByRole('heading', { name: 'Edit appointment' })).toBeInTheDocument();
    expect(window.location.search).toContain('view=week');
  });

  it('toggles dark mode and remembers it', async () => {
    const user = userEvent.setup();
    render(<App />);
    await screen.findByText('Alex Morgan');
    await user.click(screen.getByRole('button', { name: 'Switch to dark mode' }));
    expect(document.documentElement.dataset.theme).toBe('dark');
    expect(window.localStorage.getItem('appt-theme')).toBe('dark');
    expect(screen.getByRole('button', { name: 'Switch to light mode' })).toBeInTheDocument();
  });

  it('shows a retryable error when the API is unreachable', async () => {
    globalThis.fetch = (() => Promise.reject(new TypeError('network'))) as typeof fetch;
    render(<App />);
    expect(await screen.findByText(/Cannot reach the server/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Try again' })).toBeInTheDocument();
  });
});

describe('date utils', () => {
  it('groups consecutive items by day', () => {
    const mk = (dateTime: string) => ({ id: dateTime, customerName: 'x', service: 'y', dateTime, status: 'Pending' as const });
    const g = groupByDay([mk('2026-11-02T10:00'), mk('2026-11-02T11:00'), mk('2026-11-03T09:00')]);
    expect(g.map((x) => x.items.length)).toEqual([2, 1]);
  });
  it('formats 12-hour time', () => {
    expect(formatTime('2026-11-02T00:05')).toEqual({ clock: '12:05', suffix: 'AM' });
    expect(formatTime('2026-11-02T14:00')).toEqual({ clock: '2:00', suffix: 'PM' });
  });
  it('highlights matches case-insensitively', () => {
    expect(highlightParts('Alex Morgan', 'ALEX')).toEqual([{ text: 'Alex', match: true }, { text: ' Morgan', match: false }]);
  });
  it('computes Monday-based weeks across month boundaries', () => {
    expect(weekStart('2026-11-02')).toBe('2026-11-02'); // Monday
    expect(weekStart('2026-11-08')).toBe('2026-11-02'); // Sunday belongs to the Monday before
    expect(addDays('2026-11-30', 1)).toBe('2026-12-01');
    expect(weekDays('2026-11-30')[6]).toBe('2026-12-06');
  });
});
