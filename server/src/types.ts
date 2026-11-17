export const STATUSES = ['Pending', 'Confirmed', 'Cancelled'] as const;
export type Status = (typeof STATUSES)[number];

export interface Appointment {
  id: string;
  customerName: string;
  service: string;
  /** Wall-clock time, "YYYY-MM-DDTHH:mm" (no timezone). */
  dateTime: string;
  status: Status;
}
export type AppointmentInput = Omit<Appointment, 'id'>;
export type Stats = Record<'All' | Status, number>;
export interface ListQuery {
  status?: Status | '';
  search?: string;
}

/** Both storage backends (MongoDB, JSON file) implement this, so the API never cares which one is in use. */
export interface Store {
  kind: 'mongodb' | 'json-file';
  seedIfEmpty(): Promise<void>;
  list(q?: ListQuery): Promise<Appointment[]>;
  stats(q?: { search?: string }): Promise<Stats>;
  create(data: AppointmentInput): Promise<Appointment>;
  update(id: string, data: AppointmentInput): Promise<Appointment | null>;
  updateStatus(id: string, status: Status): Promise<Appointment | null>;
  remove(id: string): Promise<boolean>;
  close(): Promise<void>;
}
