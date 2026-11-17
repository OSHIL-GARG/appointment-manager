import { STATUSES, type AppointmentInput, type Status } from './types.js';

const DT_RE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/;

export function normalizeDateTime(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const v = value.trim().replace(' ', 'T');
  if (!DT_RE.test(v)) return null;
  const d = new Date(v + ':00Z'); // only used to prove the calendar date is real
  if (Number.isNaN(d.getTime())) return null;
  if (d.toISOString().slice(0, 16) !== v) return null; // rejects e.g. 2026-02-31
  return v;
}

export const isStatus = (v: unknown): v is Status => typeof v === 'string' && (STATUSES as readonly string[]).includes(v);

export type FieldErrors = Partial<Record<keyof AppointmentInput, string>>;

export function validateAppointment(body: Record<string, unknown> = {}): { errors: FieldErrors; value: AppointmentInput } {
  const errors: FieldErrors = {};
  const customerName = typeof body.customerName === 'string' ? body.customerName.trim() : '';
  const service = typeof body.service === 'string' ? body.service.trim() : '';
  const status = typeof body.status === 'string' ? body.status.trim() : '';

  if (!customerName) errors.customerName = 'Customer name is required.';
  else if (customerName.length > 100) errors.customerName = 'Customer name must be 100 characters or fewer.';

  if (!service) errors.service = 'Service is required.';
  else if (service.length > 100) errors.service = 'Service must be 100 characters or fewer.';

  let dateTime = '';
  if (!body.dateTime) errors.dateTime = 'Date and time are required.';
  else {
    const n = normalizeDateTime(body.dateTime);
    if (!n) errors.dateTime = 'Enter a valid date and time.';
    else dateTime = n;
  }

  if (!status) errors.status = 'Status is required.';
  else if (!isStatus(status)) errors.status = `Status must be one of: ${STATUSES.join(', ')}.`;

  return { errors, value: { customerName, service, dateTime, status: status as Status } };
}
