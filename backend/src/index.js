import express      from 'express';
import cors         from 'cors';
import helmet       from 'helmet';
import rateLimit    from 'express-rate-limit';
import dotenv       from 'dotenv';
import path         from 'path';
import crypto       from 'crypto';
import { fileURLToPath } from 'url';
import routes       from './routes/index.js';

dotenv.config();

const app  = express();
const PORT = process.env.PORT || 4000;

// Paths
const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);
const DOCS_ROOT  = path.resolve(__dirname, '..', '..', 'docs');

// ── Cookie parser (sin dependencias extra) ────────────────────────────────
function parseCookies(req, _res, next) {
  req.cookies = {};
  for (const part of (req.headers.cookie || '').split(';')) {
    const idx = part.indexOf('=');
    if (idx < 0) continue;
    const k = part.slice(0, idx).trim();
    const v = part.slice(idx + 1).trim();
    try { req.cookies[k] = decodeURIComponent(v); } catch { req.cookies[k] = v; }
  }
  next();
}

// Token determinista: HMAC(DOCS_PASSWORD, JWT_SECRET) → no necesita almacenamiento
function docsToken() {
  return crypto
    .createHmac('sha256', process.env.JWT_SECRET || 'dev-secret')
    .update(process.env.DOCS_PASSWORD || 'fintrack')
    .digest('hex');
}

// ── Página de login para docs técnica ────────────────────────────────────
function loginPage(errMsg = '') {
  return `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>FinTrack · Docs técnica</title>
<style>
  *{box-sizing:border-box;margin:0;padding:0}
  body{font-family:system-ui,sans-serif;background:#0f172a;color:#e2e8f0;display:flex;align-items:center;justify-content:center;min-height:100vh;padding:1rem}
  .card{background:#1e293b;border:1px solid #334155;border-radius:16px;padding:2rem;width:100%;max-width:360px}
  .logo{display:flex;align-items:center;gap:10px;margin-bottom:1.5rem}
  .logo-icon{width:36px;height:36px;background:#6366f1;border-radius:8px;display:flex;align-items:center;justify-content:center;font-size:18px}
  .logo-name{font-size:1.25rem;font-weight:700;color:#fff}
  h2{font-size:.9rem;color:#94a3b8;margin-bottom:1.5rem}
  label{display:block;font-size:.78rem;color:#94a3b8;margin-bottom:.4rem}
  input{width:100%;padding:.65rem .9rem;background:#0f172a;border:1px solid #334155;border-radius:8px;color:#e2e8f0;font-size:.9rem;outline:none}
  input:focus{border-color:#6366f1}
  .err{background:#450a0a;border:1px solid #7f1d1d;border-radius:8px;padding:.6rem .9rem;font-size:.82rem;color:#fca5a5;margin-bottom:1rem}
  button{width:100%;margin-top:1rem;padding:.7rem;background:#6366f1;border:none;border-radius:8px;color:#fff;font-size:.9rem;font-weight:600;cursor:pointer;transition:background .15s}
  button:hover{background:#4f46e5}
</style>
</head>
<body>
<div class="card">
  <div class="logo">
    <div class="logo-icon">📈</div>
    <span class="logo-name">FinTrack</span>
  </div>
  <h2>Documentación técnica &middot; Acceso restringido</h2>
  ${errMsg ? `<div class="err">${errMsg}</div>` : ''}
  <form method="POST" action="/docs/technical/_login">
    <label for="pwd">Contraseña</label>
    <input id="pwd" type="password" name="password" autofocus autocomplete="current-password" />
    <button type="submit">Acceder</button>
  </form>
</div>
</body>
</html>`;
}

// ── Middlewares necesarios ANTES de las rutas de docs ─────────────────────
app.use(parseCookies);
app.use(express.urlencoded({ extended: false }));

// ── Docs: functional (sin auth) ───────────────────────────────────────────
app.use('/docs/functional', express.static(path.join(DOCS_ROOT, 'functional')));

// ── Docs: technical (con auth de contraseña) ──────────────────────────────
// POST login
app.post('/docs/technical/_login', (req, res) => {
  const expected = process.env.DOCS_PASSWORD || 'fintrack';
  if (req.body.password === expected) {
    res.setHeader(
      'Set-Cookie',
      `docs_auth=${docsToken()}; Path=/docs/technical; HttpOnly; SameSite=Lax; Max-Age=${60 * 60 * 24 * 7}`
    );
    return res.redirect('/docs/technical/');
  }
  res.status(401).send(loginPage('Contraseña incorrecta'));
});

// Guard para el resto de rutas de docs técnica
app.use('/docs/technical', (req, res, next) => {
  if (req.cookies.docs_auth === docsToken()) return next();
  res.status(401).send(loginPage());
});

app.use('/docs/technical', express.static(path.join(DOCS_ROOT, 'technical')));

// ── Seguridad global (después de docs para no bloquear CDN de Docsify) ────
app.use(helmet());
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true,
}));
app.use(rateLimit({ windowMs: 15 * 60 * 1000, max: 200 }));

// Body parsing
app.use(express.json());

// ── API ────────────────────────────────────────────────────────────────────
app.use('/api', routes);

// Health check
app.get('/health', (_req, res) => res.json({ status: 'ok', ts: new Date() }));

// 404
app.use((_req, res) => res.status(404).json({ error: 'Ruta no encontrada' }));

app.listen(PORT, () => console.log(`🚀 FinTrack API corriendo en http://localhost:${PORT}`));
