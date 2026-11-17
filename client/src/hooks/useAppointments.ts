import { useCallback, useEffect, useRef, useState } from 'react';
import {
  createAppointment, deleteAppointment, getStats, listAppointments, updateAppointment, updateStatus,
} from '../api';
import type { ApiError, Appointment, AppointmentInput, Stats, Status, StatusFilter } from '../types';

const ZERO: Stats = { All: 0, Pending: 0, Confirmed: 0, Cancelled: 0 };
const msg = (e: unknown, fallback: string) => (e as ApiError)?.message || fallback;

export type StatusResult = { ok: true; noop?: boolean; prev?: Status } | { ok: false; error: string };

export function useAppointments({ status, search }: { status: StatusFilter; search: string }) {
  const [items, setItems] = useState<Appointment[]>([]);
  const [counts, setCounts] = useState<Stats>(ZERO);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const latest = useRef(0);

  const load = useCallback(async () => {
    const id = ++latest.current;
    setLoading(true);
    try {
      const [list, stats] = await Promise.all([listAppointments({ status, search }), getStats({ search })]);
      if (id !== latest.current) return; // a newer request superseded this one
      setItems(list);
      setCounts(stats);
      setError('');
    } catch (e) {
      if (id === latest.current) setError(msg(e, 'Could not load appointments.'));
    } finally {
      if (id === latest.current) setLoading(false);
    }
  }, [status, search]);

  useEffect(() => {
    void load();
  }, [load]);

  const create = useCallback(
    async (data: AppointmentInput) => {
      const created = await createAppointment(data);
      await load();
      return created;
    },
    [load]
  );

  const update = useCallback(
    async (id: string, data: AppointmentInput) => {
      const saved = await updateAppointment(id, data);
      await load();
      return saved;
    },
    [load]
  );

  // Optimistic: update the UI first; if the server rejects it, reload to roll back.
  const changeStatus = useCallback(
    async (item: Appointment, next: Status): Promise<StatusResult> => {
      const prev = item.status;
      if (prev === next) return { ok: true, noop: true };
      setItems((cur) =>
        cur.flatMap((a) => {
          if (a.id !== item.id) return [a];
          return status === 'All' || status === next ? [{ ...a, status: next }] : [];
        })
      );
      setCounts((c) => ({ ...c, [prev]: Math.max(0, c[prev] - 1), [next]: c[next] + 1 }));
      try {
        await updateStatus(item.id, next);
        return { ok: true, prev };
      } catch (e) {
        await load();
        return { ok: false, error: msg(e, 'Could not update the status.') };
      }
    },
    [status, load]
  );

  const remove = useCallback(
    async (item: Appointment) => {
      setItems((cur) => cur.filter((a) => a.id !== item.id));
      setCounts((c) => ({ ...c, All: Math.max(0, c.All - 1), [item.status]: Math.max(0, c[item.status] - 1) }));
      try {
        await deleteAppointment(item.id);
        return { ok: true as const };
      } catch (e) {
        await load();
        return { ok: false as const, error: msg(e, 'Could not delete the appointment.') };
      }
    },
    [load]
  );

  // Undo for delete: re-create the appointment (it gets a new id).
  const restore = useCallback(
    async (item: Appointment) => {
      const { id: _id, ...data } = item;
      void _id;
      await createAppointment(data);
      await load();
    },
    [load]
  );

  return { items, counts, loading, error, reload: load, create, update, changeStatus, remove, restore };
}
