import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import os from 'node:os';
import path from 'node:path';
import fs from 'node:fs/promises';
import type { Server } from 'node:http';
import { createApp } from '../src/app.js';
import { createFileStore } from '../src/store.js';

let server: Server;
let base: string;
let tmp: string;
let file: string;

before(async () => {
  tmp = await fs.mkdtemp(path.join(os.tmpdir(), 'appt-'));
  file = path.join(tmp, 'a.json');
  const store = await createFileStore(file);
  await store.seedIfEmpty();
  server = createApp(store).listen(0);
  base = `http://127.0.0.1:${(server.address() as { port: number }).port}/api`;
});
after(async () => {
  server.close();
  await fs.rm(tmp, { recursive: true, force: true });
});

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const j = (r: Response) => r.json() as Promise<any>;
const send = (method: string, url: string, body?: unknown) =>
  fetch(base + url, { method, headers: { 'Content-Type': 'application/json' }, body: body === undefined ? undefined : JSON.stringify(body) });

test('lists 3 seeded appointments sorted by date', async () => {
  const list = await fetch(base + '/appointments').then(j);
  assert.equal(list.length, 3);
  assert.deepEqual(list.map((a: { customerName: string }) => a.customerName), ['Alex Morgan', 'Jamie Lee', 'Taylor Smith']);
});

test('POST validates required fields', async () => {
  const r = await send('POST', '/appointments', {});
  assert.equal(r.status, 400);
  const body = await j(r);
  assert.deepEqual(Object.keys(body.errors).sort(), ['customerName', 'dateTime', 'service', 'status']);
});

test('POST rejects impossible date and bad status', async () => {
  const r = await send('POST', '/appointments', { customerName: 'A', service: 'B', dateTime: '2026-02-31T10:00', status: 'Nope' });
  const body = await j(r);
  assert.equal(r.status, 400);
  assert.ok(body.errors.dateTime && body.errors.status);
});

test('POST rejects over-long names', async () => {
  const r = await send('POST', '/appointments', { customerName: 'x'.repeat(101), service: 'B', dateTime: '2026-11-04T09:00', status: 'Pending' });
  assert.equal(r.status, 400);
});

let createdId = '';
test('POST creates an appointment (trimmed)', async () => {
  const r = await send('POST', '/appointments', { customerName: '  Sam Rivera ', service: 'Checkup', dateTime: '2026-11-04T09:15', status: 'Pending' });
  assert.equal(r.status, 201);
  const a = await j(r);
  createdId = a.id;
  assert.equal(a.customerName, 'Sam Rivera');
  assert.equal((await fetch(base + '/appointments').then(j)).length, 4);
});

test('PUT edits an appointment; validates; 404 for unknown id', async () => {
  let r = await send('PUT', `/appointments/${createdId}`, { customerName: 'Sam R.', service: 'Follow-up', dateTime: '2026-11-05 16:45', status: 'Confirmed' });
  assert.equal(r.status, 200);
  const a = await j(r);
  assert.deepEqual([a.customerName, a.service, a.dateTime, a.status], ['Sam R.', 'Follow-up', '2026-11-05T16:45', 'Confirmed']);
  r = await send('PUT', `/appointments/${createdId}`, { customerName: '', service: 'x', dateTime: '2026-11-05T10:00', status: 'Pending' });
  assert.equal(r.status, 400);
  r = await send('PUT', '/appointments/nope', { customerName: 'A', service: 'B', dateTime: '2026-11-05T10:00', status: 'Pending' });
  assert.equal(r.status, 404);
});

test('PATCH changes status; invalid status and unknown id fail', async () => {
  let r = await send('PATCH', `/appointments/${createdId}/status`, { status: 'Pending' });
  assert.equal(r.status, 200);
  assert.equal((await j(r)).status, 'Pending');
  r = await send('PATCH', `/appointments/${createdId}/status`, { status: 'Done' });
  assert.equal(r.status, 400);
  r = await send('PATCH', '/appointments/does-not-exist/status', { status: 'Pending' });
  assert.equal(r.status, 404);
});

test('filters by status', async () => {
  const c = await fetch(base + '/appointments?status=Confirmed').then(j);
  assert.ok(c.length >= 1 && c.every((a: { status: string }) => a.status === 'Confirmed'));
  assert.equal((await fetch(base + '/appointments?status=All').then(j)).length, 4);
  assert.equal((await fetch(base + '/appointments?status=Bogus')).status, 400);
});

test('searches by customer name (partial, case-insensitive) and combines with status', async () => {
  let r = await fetch(base + '/appointments?search=ALEX').then(j);
  assert.deepEqual(r.map((a: { customerName: string }) => a.customerName), ['Alex Morgan']);
  r = await fetch(base + '/appointments?search=a&status=Cancelled').then(j);
  assert.deepEqual(r.map((a: { customerName: string }) => a.customerName), ['Taylor Smith']);
  r = await fetch(base + '/appointments?search=.*').then(j);
  assert.equal(r.length, 0); // regex chars are treated literally
});

test('stats returns per-status counts and respects search', async () => {
  assert.deepEqual(await fetch(base + '/appointments/stats').then(j), { All: 4, Pending: 2, Confirmed: 1, Cancelled: 1 });
  assert.deepEqual(await fetch(base + '/appointments/stats?search=alex').then(j), { All: 1, Pending: 1, Confirmed: 0, Cancelled: 0 });
});

test('DELETE removes an appointment; second delete is 404', async () => {
  let r = await send('DELETE', `/appointments/${createdId}`);
  assert.equal(r.status, 204);
  r = await send('DELETE', `/appointments/${createdId}`);
  assert.equal(r.status, 404);
  assert.equal((await fetch(base + '/appointments').then(j)).length, 3);
});

test('persists to disk (a new store instance sees the data)', async () => {
  const store2 = await createFileStore(file);
  assert.equal((await store2.list()).length, 3);
});

test('malformed JSON returns 400', async () => {
  const r = await fetch(base + '/appointments', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{bad' });
  assert.equal(r.status, 400);
});
