// Vercel's function only ever requires dist/create-app.js (via api/index.ts).
// dist/main.js is the traditional `node dist/main` entry point, used only for
// local `pnpm start` — but Vercel's file tracer bundles it into the deployed
// function anyway, roughly doubling its size and slowing cold starts. Remove
// it after the build, but only in Vercel's own build environment so
// `pnpm build && pnpm start` still works everywhere else.
const fs = require('fs');
const path = require('path');

if (process.env.VERCEL) {
  const mainJs = path.join(__dirname, '..', 'dist', 'main.js');
  fs.rmSync(mainJs, { force: true });
}
