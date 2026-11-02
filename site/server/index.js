const WINDOW_MS = 10 * 60 * 1000;
const MAX_REQUESTS_PER_WINDOW = 5;
const MAX_FILE_SIZE = 10 * 1024 * 1024;
const MAX_TOTAL_FILE_SIZE = 20 * 1024 * 1024;
const MAX_FILES = 5;
const ALLOWED_EXTENSIONS = new Set([
  "pdf", "doc", "docx", "xls", "xlsx", "jpg", "jpeg", "png",
]);
const attempts = new Map();

const json = (body, status = 200) => new Response(JSON.stringify(body), {
  status,
  headers: {
    "content-type": "application/json; charset=utf-8",
    "cache-control": "no-store",
  },
});

const cleanText = (value, maxLength) => String(value ?? "").trim().slice(0, maxLength);

function isRateLimited(request) {
  const now = Date.now();
  const ip = request.headers.get("CF-Connecting-IP") || "unknown";
  const recent = (attempts.get(ip) || []).filter((timestamp) => now - timestamp < WINDOW_MS);
  recent.push(now);
  attempts.set(ip, recent);
  return recent.length > MAX_REQUESTS_PER_WINDOW;
}

function isSameOrigin(request) {
  const origin = request.headers.get("origin");
  return !origin || origin === new URL(request.url).origin;
}

async function handleLead(request, env) {
  if (request.method !== "POST") return json({ ok: false, code: "method_not_allowed" }, 405);
  if (!isSameOrigin(request)) return json({ ok: false, code: "invalid_origin" }, 403);
  if (isRateLimited(request)) return json({ ok: false, code: "rate_limited" }, 429);

  const contentType = request.headers.get("content-type") || "";
  const contentLength = Number(request.headers.get("content-length") || 0);
  if (!contentType.includes("multipart/form-data")) return json({ ok: false, code: "invalid_content_type" }, 415);
  if (contentLength > MAX_TOTAL_FILE_SIZE + 2 * 1024 * 1024) return json({ ok: false, code: "request_too_large" }, 413);

  let incoming;
  try {
    incoming = await request.formData();
  } catch {
    return json({ ok: false, code: "invalid_form" }, 400);
  }

  if (cleanText(incoming.get("website"), 100)) return json({ ok: true });

  const startedAt = Number(incoming.get("started_at"));
  const elapsed = Date.now() - startedAt;
  if (!Number.isFinite(startedAt) || elapsed < 3000 || elapsed > 2 * 60 * 60 * 1000) {
    return json({ ok: false, code: "invalid_timing" }, 400);
  }

  const name = cleanText(incoming.get("name"), 120);
  const company = cleanText(incoming.get("company"), 180);
  const contact = cleanText(incoming.get("contact"), 220);
  const message = cleanText(incoming.get("message"), 4000);
  const consent = cleanText(incoming.get("consent"), 20);
  if (!name || !contact || !message || !consent) return json({ ok: false, code: "missing_fields" }, 400);

  const files = incoming.getAll("attachments").filter((item) => item instanceof File && item.size > 0);
  if (files.length > MAX_FILES) return json({ ok: false, code: "too_many_files" }, 400);
  let totalSize = 0;
  for (const file of files) {
    totalSize += file.size;
    const extension = file.name.toLowerCase().split(".").pop() || "";
    if (!ALLOWED_EXTENSIONS.has(extension)) return json({ ok: false, code: "invalid_file_type" }, 400);
    if (file.size > MAX_FILE_SIZE) return json({ ok: false, code: "file_too_large" }, 413);
  }
  if (totalSize > MAX_TOTAL_FILE_SIZE) return json({ ok: false, code: "files_too_large" }, 413);

  if (!env.LEAD_WEBHOOK_URL) return json({ ok: false, code: "integration_not_configured" }, 503);

  const outgoing = new FormData();
  outgoing.set("name", name);
  outgoing.set("company", company);
  outgoing.set("contact", contact);
  outgoing.set("message", message);
  outgoing.set("consent", consent);
  for (const key of [
    "utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term",
    "yclid", "gclid", "service", "landing_path", "referrer",
  ]) outgoing.set(key, cleanText(incoming.get(key), 1000));
  for (const file of files) outgoing.append("attachments", file, file.name);

  const headers = {};
  if (env.LEAD_WEBHOOK_SECRET) headers.authorization = `Bearer ${env.LEAD_WEBHOOK_SECRET}`;

  let response;
  try {
    response = await fetch(env.LEAD_WEBHOOK_URL, { method: "POST", headers, body: outgoing });
  } catch {
    return json({ ok: false, code: "delivery_unavailable" }, 502);
  }
  if (!response.ok) return json({ ok: false, code: "delivery_failed" }, 502);
  return json({ ok: true });
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname === "/api/lead") return handleLead(request, env);
    if (url.pathname === "/api/site-config") {
      return json({ metrikaId: String(env.YANDEX_METRIKA_ID || "") });
    }
    return env.ASSETS.fetch(request);
  },
};
