import { cp, mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const project = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const dist = path.join(project, "dist");
const output = path.resolve(project, "..", "..", "key-solution-html");

const homeHtml = await readFile(path.join(dist, "index.html"), "utf8");
const cssMatch = homeHtml.match(/<link rel="stylesheet" href="\/_astro\/([^"]+\.css)">/);
if (!cssMatch) throw new Error("Built CSS reference not found");
const css = await readFile(path.join(dist, "_astro", cssMatch[1]), "utf8");

const makePortable = (html, home = false) => html
  .replace(/<link rel="stylesheet" href="\/_astro\/[^"]+">/, `<style>${css}</style>`)
  .replaceAll('href="/#request"', home ? 'href="#request"' : 'href="key-solution-site.html#request"')
  .replaceAll('href="/privacy/"', 'href="privacy.html"')
  .replaceAll('href="/consent/"', 'href="consent.html"')
  .replaceAll('href="/"', home ? 'href="#"' : 'href="key-solution-site.html"')
  .replaceAll('href="/documents/', 'href="documents/');

await mkdir(output, { recursive: true });
await writeFile(path.join(output, "key-solution-site.html"), makePortable(homeHtml, true), "utf8");
for (const page of ["privacy", "consent"]) {
  const pageHtml = await readFile(path.join(dist, page, "index.html"), "utf8");
  await writeFile(path.join(output, `${page}.html`), makePortable(pageHtml), "utf8");
}
await cp(path.join(project, "public", "documents"), path.join(output, "documents"), {
  recursive: true,
  force: true,
});

console.log(path.join(output, "key-solution-site.html"));
