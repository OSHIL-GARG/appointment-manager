import fs from 'node:fs/promises';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import mongoose from 'mongoose';
import type { Appointment, AppointmentInput, ListQuery, Stats, Status, Store } from './types.js';

export const SEED: AppointmentInput[] = [
  { customerName: 'Alex Morgan', service: 'Consultation', dateTime: '2026-11-02T10:00', status: 'Pending' },
  { customerName: 'Jamie Lee', service: 'Follow-up', dateTime: '2026-11-02T11:30', status: 'Confirmed' },
  { customerName: 'Taylor Smith', service: 'Review', dateTime: '2026-11-03T14:00', status: 'Cancelled' },
];

const escapeRegex = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const byDate = (a: Appointment, b: Appointment) => a.dateTime.localeCompare(b.dateTime) || a.customerName.localeCompare(b.customerName);

const buildStats = (pairs: Array<[string, number]>): Stats => {
  const out: Stats = { All: 0, Pending: 0, Confirmed: 0, Cancelled: 0 };
  for (const [status, n] of pairs) {
    if (status in out) out[status as Status] += n;
    out.All += n;
  }
  return out;
};

/* ---------------- MongoDB store ---------------- */
const schema = new mongoose.Schema(
  {
    customerName: { type: String, required: true, trim: true, maxlength: 100 },
    service: { type: String, required: true, trim: true, maxlength: 100 },
    dateTime: { type: String, required: true },
    status: { type: String, required: true, enum: ['Pending', 'Confirmed', 'Cancelled'], default: 'Pending' },
  },
  { timestamps: true }
);
schema.index({ status: 1, dateTime: 1 });
const AppointmentModel = mongoose.models.Appointment || mongoose.model('Appointment', schema);

interface Doc {
  _id: unknown;
  customerName: string;
  service: string;
  dateTime: string;
  status: Status;
}
const toJSON = (d: Doc): Appointment => ({
  id: String(d._id),
  customerName: d.customerName,
  service: d.service,
  dateTime: d.dateTime,
  status: d.status,
});

export async function createMongoStore(uri: string): Promise<Store> {
  await mongoose.connect(uri, { serverSelectionTimeoutMS: 4000 });
  const nameMatch = (search?: string) => (search ? { customerName: { $regex: escapeRegex(search), $options: 'i' } } : {});
  return {
    kind: 'mongodb',
    async seedIfEmpty() {
      if ((await AppointmentModel.countDocuments()) === 0) await AppointmentModel.insertMany(SEED);
    },
    async list({ status, search }: ListQuery = {}) {
      const q: Record<string, unknown> = { ...nameMatch(search) };
      if (status) q.status = status;
      const docs = (await AppointmentModel.find(q).sort({ dateTime: 1, customerName: 1 }).lean()) as unknown as Doc[];
      return docs.map(toJSON);
    },
    async stats({ search } = {}) {
      const rows = await AppointmentModel.aggregate([{ $match: nameMatch(search) }, { $group: { _id: '$status', n: { $sum: 1 } } }]);
      return buildStats(rows.map((r) => [r._id as string, r.n as number]));
    },
    async create(data) {
      return toJSON((await AppointmentModel.create(data)) as unknown as Doc);
    },
    async update(id, data) {
      if (!mongoose.isValidObjectId(id)) return null;
      const doc = (await AppointmentModel.findByIdAndUpdate(id, data, { new: true, runValidators: true }).lean()) as unknown as Doc | null;
      return doc ? toJSON(doc) : null;
    },
    async updateStatus(id, status) {
      if (!mongoose.isValidObjectId(id)) return null;
      const doc = (await AppointmentModel.findByIdAndUpdate(id, { status }, { new: true, runValidators: true }).lean()) as unknown as Doc | null;
      return doc ? toJSON(doc) : null;
    },
    async remove(id) {
      if (!mongoose.isValidObjectId(id)) return false;
      return (await AppointmentModel.findByIdAndDelete(id)) !== null;
    },
    async close() {
      await mongoose.disconnect();
    },
  };
}

/* ---------------- JSON file fallback store ---------------- */
export async function createFileStore(file: string): Promise<Store> {
  await fs.mkdir(path.dirname(file), { recursive: true });
  let items: Appointment[] | null;
  try {
    items = JSON.parse(await fs.readFile(file, 'utf8')) as Appointment[];
  } catch {
    items = null;
  }
  const data = () => items ?? [];
  const save = () => fs.writeFile(file, JSON.stringify(items, null, 2));
  const matches = (a: Appointment, search?: string) => !search || a.customerName.toLowerCase().includes(search.toLowerCase());
  return {
    kind: 'json-file',
    async seedIfEmpty() {
      if (data().length === 0) {
        items = SEED.map((s) => ({ id: randomUUID(), ...s }));
        await save();
      }
    },
    async list({ status, search } = {}) {
      return data()
        .filter((a) => (!status || a.status === status) && matches(a, search))
        .sort(byDate)
        .map((a) => ({ ...a }));
    },
    async stats({ search } = {}) {
      return buildStats(data().filter((a) => matches(a, search)).map((a) => [a.status, 1]));
    },
    async create(input) {
      items = data();
      const item: Appointment = { id: randomUUID(), ...input };
      items.push(item);
      await save();
      return { ...item };
    },
    async update(id, input) {
      const item = data().find((a) => a.id === id);
      if (!item) return null;
      Object.assign(item, input);
      await save();
      return { ...item };
    },
    async updateStatus(id, status) {
      const item = data().find((a) => a.id === id);
      if (!item) return null;
      item.status = status;
      await save();
      return { ...item };
    },
    async remove(id) {
      const before = data().length;
      items = data().filter((a) => a.id !== id);
      if (items.length === before) return false;
      await save();
      return true;
    },
    async close() {},
  };
}
