import type { ApiError, Appointment, AppointmentInput, Stats, Status, StatusFilter } from './types';

const BASE = ((import.meta.env.VITE_API_URL as string | undefined) || '') + '/api';

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  let res: Response;
  try {
    res = await fetch(BASE + path, { headers: { 'Content-Type': 'application/json' }, ...options });
  } catch {
    throw { message: 'Cannot reach the server. Check that the API is running.' } satisfies ApiError;
  }
  const data = res.status === 204 ? {} : await res.json().catch(() => ({}));
  if (!res.ok) {
    throw { message: data.error || 'Request failed.', fieldErrors: data.errors || {} } satisfies ApiError;
  }
  return data as T;
}

const qs = (p: { status?: StatusFilter; search?: string }) => {
  const q = new URLSearchParams();
  if (p.status && p.status !== 'All') q.set('status', p.status);
  if (p.search) q.set('search', p.search);
  const s = q.toString();
  return s ? `?${s}` : '';
};
const id = (v: string) => encodeURIComponent(v);
const json = (body: unknown) => JSON.stringify(body);

export const listAppointments = (f: { status: StatusFilter; search: string }) => request<Appointment[]>('/appointments' + qs(f));
export const getStats = (f: { search: string }) => request<Stats>('/appointments/stats' + qs({ search: f.search }));
export const createAppointment = (b: AppointmentInput) => request<Appointment>('/appointments', { method: 'POST', body: json(b) });
export const updateAppointment = (aid: string, b: AppointmentInput) => request<Appointment>(`/appointments/${id(aid)}`, { method: 'PUT', body: json(b) });
export const updateStatus = (aid: string, status: Status) => request<Appointment>(`/appointments/${id(aid)}/status`, { method: 'PATCH', body: json({ status }) });
export const deleteAppointment = (aid: string) => request<unknown>(`/appointments/${id(aid)}`, { method: 'DELETE' });
