import { copyFile, mkdir } from "node:fs/promises";

const serverDir = new URL("../dist/server/", import.meta.url);

await mkdir(serverDir, { recursive: true });
await copyFile(
  new URL("../worker/index.mjs", import.meta.url),
  new URL("index.js", serverDir),
);
