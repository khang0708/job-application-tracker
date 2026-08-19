import type { IncomingMessage, ServerResponse } from 'http';
import { createApp } from '../dist/create-app';

let appPromise: Promise<Awaited<ReturnType<typeof createApp>>> | null = null;

async function getApp() {
  if (!appPromise) {
    appPromise = createApp()
      .then(async (app) => {
        await app.init();
        return app;
      })
      .catch((err) => {
        appPromise = null; // allow a later request to retry instead of caching a permanent failure
        throw err;
      });
  }
  return appPromise;
}

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  try {
    const app = await getApp();
    const instance = app.getHttpAdapter().getInstance();
    instance(req, res);
  } catch (err) {
    console.error('Failed to initialize backend app', err);
    res.statusCode = 500;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ message: 'Internal server error during app initialization' }));
  }
}
