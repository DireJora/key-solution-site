import express from 'express';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import multer from 'multer';
import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';

const app = express();
const PORT = Number(process.env.PORT || 3000);
const DATA_DIR = process.env.DATA_DIR || '/var/lib/key-solution';
const LEADS_DIR = path.join(DATA_DIR, 'leads');
const UPLOADS_DIR = path.join(DATA_DIR, 'uploads');
const METRIKA_ID = String(process.env.METRIKA_ID || '').trim();
const N8N_WEBHOOK_URL = String(process.env.N8N_WEBHOOK_URL || '').trim();
const PUBLIC_BASE_URL = String(process.env.PUBLIC_BASE_URL || 'https://klyuchevoe-reshenie.ru').replace(/\/$/, '');

await fs.mkdir(LEADS_DIR, { recursive: true });
await fs.mkdir(UPLOADS_DIR, { recursive: true });

app.set('trust proxy', 1);
app.use(helmet({ contentSecurityPolicy: false }));
app.use('/api/lead', rateLimit({ windowMs: 10 * 60 * 1000, limit: 8, standardHeaders: true, legacyHeaders: false }));

const allowedExtensions = new Set(['.pdf','.doc','.docx','.xls','.xlsx','.jpg','.jpeg','.png']);
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOADS_DIR),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname || '').toLowerCase();
    cb(null, `${Date.now()}-${crypto.randomUUID()}${ext}`);
  }
});
const upload = multer({
  storage,
  limits: { files: 5, fileSize: 10 * 1024 * 1024, fields: 30, fieldSize: 5000 },
  fileFilter: (_req, file, cb) => {
    const ext = path.extname(file.originalname || '').toLowerCase();
    cb(allowedExtensions.has(ext) ? null : new Error('unsupported_file_type'), allowedExtensions.has(ext));
  }
});

app.get('/api/health', (_req, res) => res.json({ ok: true }));
app.get('/api/site-config', (_req, res) => res.json({ metrikaId: /^\d+$/.test(METRIKA_ID) ? METRIKA_ID : '' }));

app.post('/api/lead', upload.array('attachments', 5), async (req, res) => {
  try {
    const body = req.body || {};
    const files = Array.isArray(req.files) ? req.files : [];
    const totalSize = files.reduce((sum, f) => sum + Number(f.size || 0), 0);
    if (totalSize > 20 * 1024 * 1024) return res.status(400).json({ ok: false, code: 'files_too_large' });
    if (String(body.website || '').trim()) return res.status(200).json({ ok: true });

    const name = String(body.name || '').trim().slice(0, 120);
    const company = String(body.company || '').trim().slice(0, 180);
    const contact = String(body.contact || '').trim().slice(0, 220);
    const message = String(body.message || '').trim().slice(0, 4000);
    const consent = String(body.consent || '') === 'yes';
    if (!name || !contact || !message || !consent) return res.status(400).json({ ok: false, code: 'validation_failed' });

    const startedAt = Number(body.started_at || 0);
    if (startedAt && Date.now() - startedAt < 1500) return res.status(429).json({ ok: false, code: 'rate_limited' });

    const id = crypto.randomUUID();
    const createdAt = new Date().toISOString();
    const lead = {
      id, createdAt, name, company, contact, message,
      service: String(body.service || 'general').slice(0, 120),
      landingPath: String(body.landing_path || '').slice(0, 1000),
      referrer: String(body.referrer || '').slice(0, 1000),
      utm: Object.fromEntries(['utm_source','utm_medium','utm_campaign','utm_content','utm_term','yclid','gclid'].map(k => [k, String(body[k] || '').slice(0, 500)])),
      ip: req.ip,
      userAgent: String(req.get('user-agent') || '').slice(0, 1000),
      attachments: files.map(f => ({ originalName: f.originalname, storedName: f.filename, size: f.size, mimeType: f.mimetype }))
    };

    await fs.writeFile(path.join(LEADS_DIR, `${createdAt.slice(0,10)}.jsonl`), `${JSON.stringify(lead)}\n`, { flag: 'a', mode: 0o600 });

    if (N8N_WEBHOOK_URL) {
      try {
        await fetch(N8N_WEBHOOK_URL, {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ ...lead, source: 'klyuchevoe-reshenie.ru', publicBaseUrl: PUBLIC_BASE_URL }),
          signal: AbortSignal.timeout(5000)
        });
      } catch (err) {
        console.error('n8n delivery failed', err?.message || err);
      }
    }

    return res.status(201).json({ ok: true, id });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ ok: false, code: 'delivery_failed' });
  }
});

app.use((err, _req, res, _next) => {
  const code = err?.message === 'unsupported_file_type' ? 'unsupported_file_type' : err?.code === 'LIMIT_FILE_SIZE' ? 'files_too_large' : 'delivery_failed';
  const status = code === 'delivery_failed' ? 500 : 400;
  res.status(status).json({ ok: false, code });
});

app.listen(PORT, '127.0.0.1', () => console.log(`Lead API listening on 127.0.0.1:${PORT}`));
