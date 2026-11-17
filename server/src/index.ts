import 'dotenv/config';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createApp } from './app.js';
import { createFileStore, createMongoStore } from './store.js';
import type { Store } from './types.js';

const PORT = Number(process.env.PORT) || 4000;
const uri = process.env.MONGODB_URI;
const dataFile = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'data', 'appointments.json');

async function getStore(): Promise<Store> {
  if (uri) {
    try {
      const store = await createMongoStore(uri);
      console.log('Storage: MongoDB');
      return store;
    } catch (e) {
      console.warn(`MongoDB unavailable (${(e as Error).message}). Falling back to JSON file store.`);
    }
  } else {
    console.warn('MONGODB_URI not set. Using JSON file store.');
  }
  return createFileStore(dataFile);
}

const store = await getStore();
await store.seedIfEmpty();
const server = createApp(store, { clientOrigin: process.env.CLIENT_ORIGIN }).listen(PORT, () =>
  console.log(`API on http://localhost:${PORT} (storage: ${store.kind})`)
);

const shutdown = () => server.close(() => store.close().finally(() => process.exit(0)));
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
