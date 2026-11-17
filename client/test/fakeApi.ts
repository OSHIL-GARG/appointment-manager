import type { Appointment } from '../src/types';

// In-memory stand-in for the Express API, installed as global fetch.
export function installFakeApi() {
  let n = 3;
  const data: Appointment[] = [
    { id: '1', customerName: 'Alex Morgan', service: 'Consultation', dateTime: '2026-11-02T10:00', status: 'Pending' },
    { id: '2', customerName: 'Jamie Lee', service: 'Follow-up', dateTime: '2026-11-02T11:30', status: 'Confirmed' },
    { id: '3', customerName: 'Taylor Smith', service: 'Review', dateTime: '2026-11-03T14:00', status: 'Cancelled' },
  ];
  const reply = (status: number, body: unknown) =>
    Promise.resolve({ ok: status < 400, status, json: () => Promise.resolve(body) } as Response);
  const filtered = (u: URL) => {
    const s = (u.searchParams.get('search') || '').toLowerCase();
    return data.filter((a) => !s || a.customerName.toLowerCase().includes(s));
  };

  globalThis.fetch = ((url: string, opts: RequestInit = {}) => {
    const u = new URL(url, 'http://x');
    const method = opts.method || 'GET';
    const body = opts.body ? JSON.parse(opts.body as string) : {};
    if (u.pathname === '/api/appointments/stats') {
      const rows = filtered(u);
      const c = { All: rows.length, Pending: 0, Confirmed: 0, Cancelled: 0 };
      rows.forEach((a) => c[a.status]++);
      return reply(200, c);
    }
    if (u.pathname === '/api/appointments' && method === 'GET') {
      const st = u.searchParams.get('status');
      const rows = filtered(u).filter((a) => !st || a.status === st);
      return reply(200, [...rows].sort((a, b) => a.dateTime.localeCompare(b.dateTime)));
    }
    if (u.pathname === '/api/appointments' && method === 'POST') {
      const item = { id: String(++n), ...body } as Appointment;
      data.push(item);
      return reply(201, item);
    }
    const m = u.pathname.match(/^\/api\/appointments\/([^/]+)(\/status)?$/);
    if (m) {
      const idx = data.findIndex((a) => a.id === decodeURIComponent(m[1]));
      if (idx === -1) return reply(404, { error: 'Appointment not found.' });
      if (method === 'PATCH') data[idx].status = body.status;
      else if (method === 'PUT') Object.assign(data[idx], body);
      else if (method === 'DELETE') {
        data.splice(idx, 1);
        return reply(204, {});
      }
      return reply(200, data[idx]);
    }
    return reply(404, { error: 'Not found.' });
  }) as typeof fetch;
}
