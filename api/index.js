// Vercel serverless entry point.
// The build step (script/build.ts) bundles the entire Express server into
// dist/index.cjs. This thin wrapper waits for async route registration to
// finish, then hands each request to the Express app.
import { createRequire } from "module";

const require = createRequire(import.meta.url);
const server = require("../dist/index.cjs");

export default async function handler(req, res) {
  await server.ready;
  return server.app(req, res);
}
