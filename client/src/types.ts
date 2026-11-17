export const STATUSES = ['Pending', 'Confirmed', 'Cancelled'] as const;
export type Status = (typeof STATUSES)[number];
export type StatusFilter = 'All' | Status;
export const FILTERS: StatusFilter[] = ['All', ...STATUSES];

export interface Appointment {
  id: string;
  customerName: string;
  service: string;
  /** Wall-clock time "YYYY-MM-DDTHH:mm" (no timezone). */
  dateTime: string;
  status: Status;
}
export type AppointmentInput = Omit<Appointment, 'id'>;
export type Stats = Record<StatusFilter, number>;
export type FieldErrors = Partial<Record<keyof AppointmentInput, string>>;
export type View = 'list' | 'week';

export interface ApiError {
  message: string;
  fieldErrors?: FieldErrors;
}
