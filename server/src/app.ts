import express, { type ErrorRequestHandler, type NextFunction, type Request, type RequestHandler, type Response } from 'express';
import cors from 'cors';
import { STATUSES, type Store } from './types.js';
import { isStatus, validateAppointment } from './validate.js';

// Wraps async handlers so a rejected promise reaches the error middleware instead of hanging the request.
const wrap =
  (fn: (req: Request, res: Response) => Promise<unknown>): RequestHandler =>
  (req, res, next: NextFunction) => {
    fn(req, res).catch(next);
  };

const str = (v: unknown) => (typeof v === 'string' ? v.trim() : '');

export function createApp(store: Store, opts: { clientOrigin?: string } = {}) {
  const app = express();
  app.use(cors(opts.clientOrigin ? { origin: opts.clientOrigin.split(',') } : undefined));
  app.use(express.json({ limit: '10kb' }));

  app.get('/api/health', (_req, res) => res.json({ ok: true, storage: store.kind }));

  app.get('/api/appointments', wrap(async (req, res) => {
    const status = str(req.query.status);
    const search = str(req.query.search);
    if (status && status !== 'All' && !isStatus(status)) {
      return res.status(400).json({ error: 'Invalid status filter.', errors: { status: `Status must be one of: All, ${STATUSES.join(', ')}.` } });
    }
    res.json(await store.list({ status: status === 'All' || !status ? '' : (status as typeof STATUSES[number]), search }));
  }));

  app.get('/api/appointments/stats', wrap(async (req, res) => {
    res.json(await store.stats({ search: str(req.query.search) }));
  }));

  app.post('/api/appointments', wrap(async (req, res) => {
    const { errors, value } = validateAppointment(req.body);
    if (Object.keys(errors).length) return res.status(400).json({ error: 'Validation failed.', errors });
    res.status(201).json(await store.create(value));
  }));

  app.put('/api/appointments/:id', wrap(async (req, res) => {
    const { errors, value } = validateAppointment(req.body);
    if (Object.keys(errors).length) return res.status(400).json({ error: 'Validation failed.', errors });
    const updated = await store.update(String(req.params.id), value);
    if (!updated) return res.status(404).json({ error: 'Appointment not found.' });
    res.json(updated);
  }));

  app.patch('/api/appointments/:id/status', wrap(async (req, res) => {
    const status = str(req.body?.status);
    if (!isStatus(status)) {
      return res.status(400).json({ error: 'Validation failed.', errors: { status: `Status must be one of: ${STATUSES.join(', ')}.` } });
    }
    const updated = await store.updateStatus(String(req.params.id), status);
    if (!updated) return res.status(404).json({ error: 'Appointment not found.' });
    res.json(updated);
  }));

  app.delete('/api/appointments/:id', wrap(async (req, res) => {
    const removed = await store.remove(String(req.params.id));
    if (!removed) return res.status(404).json({ error: 'Appointment not found.' });
    res.status(204).end();
  }));

  app.use('/api', (_req, res) => res.status(404).json({ error: 'Not found.' }));

  const onError: ErrorRequestHandler = (err, _req, res, _next) => {
    if (err?.type === 'entity.parse.failed') return res.status(400).json({ error: 'Request body is not valid JSON.' });
    console.error(err);
    res.status(500).json({ error: 'Something went wrong on the server.' });
  };
  app.use(onError);

  return app;
}
