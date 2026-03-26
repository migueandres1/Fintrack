# Backend

## Stack

| Componente | Tecnología |
|------------|-----------|
| Runtime | Node.js 20 |
| Framework | Express 4 |
| Base de datos | mysql2 (pool de conexiones) |
| Auth | jsonwebtoken + bcryptjs |
| Upload | multer (memoria) |
| OCR | @anthropic-ai/sdk |
| Seguridad | helmet, express-rate-limit, cors |

---

## Estructura de directorios

```
backend/src/
├── index.js              # Entry point, middlewares globales
├── config/
│   └── db.js             # Pool de conexiones MySQL
├── middleware/
│   └── auth.js           # Middleware authenticate (JWT)
├── routes/
│   └── index.js          # Todas las rutas bajo /api
└── controllers/
    ├── auth.controller.js
    ├── dashboard.controller.js
    ├── transactions.controller.js
    ├── categories.controller.js
    ├── debts.controller.js
    ├── savings.controller.js
    ├── recurring.controller.js
    ├── creditCards.controller.js
    ├── accounts.controller.js
    ├── budgets.controller.js
    └── ocr.controller.js
```

---

## Entry point (`src/index.js`)

```javascript
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import router from './routes/index.js';

const app = express();

app.use(helmet());
app.use(cors({ origin: process.env.FRONTEND_URL, credentials: true }));
app.use(rateLimit({ windowMs: 15 * 60 * 1000, max: 200 }));
app.use(express.json({ limit: '10mb' }));

app.use('/api', router);
app.get('/health', (req, res) => res.json({ status: 'ok' }));

app.listen(process.env.PORT || 4000);
```

---

## Pool de conexiones (`config/db.js`)

```javascript
import mysql from 'mysql2/promise';

export const pool = mysql.createPool({
  host:     process.env.DB_HOST,
  port:     process.env.DB_PORT || 3306,
  user:     process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
});
```

Todos los controllers importan `pool` y ejecutan queries con `await pool.query(sql, params)`.

---

## Controllers

Cada controller exporta funciones async con la firma `(req, res)`. Patrón estándar:

```javascript
export async function list(req, res) {
  try {
    const [rows] = await pool.query(
      'SELECT * FROM tabla WHERE user_id = ?',
      [req.userId]
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error interno' });
  }
}
```

### Resumen de controllers

| Controller | Responsabilidad |
|------------|----------------|
| `auth` | Registro, login, perfil, contraseña, onboarding |
| `dashboard` | Resumen financiero, score, tendencia mensual |
| `transactions` | CRUD transacciones, summary, export CSV |
| `categories` | Gestión de categorías (sistema + personalizadas), ocultar |
| `debts` | CRUD deudas, pagos, proyección de amortización |
| `savings` | CRUD metas, aportes, recálculo automático |
| `recurring` | CRUD transacciones recurrentes |
| `creditCards` | CRUD tarjetas, transacciones, pagos |
| `accounts` | CRUD cuentas bancarias, transacciones |
| `budgets` | Presupuesto mensual, compromisos, ingresos planificados |
| `ocr` | Procesamiento de recibos con Claude Haiku |

---

## Rutas (`routes/index.js`)

Todas las rutas se registran bajo el prefijo `/api`. Las rutas protegidas pasan por el middleware `authenticate` antes del controller:

```javascript
import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
// ... imports de controllers

const r = Router();

// Públicas
r.post('/auth/register', auth.register);
r.post('/auth/login', auth.login);
r.get('/health', (req, res) => res.json({ status: 'ok' }));

// Protegidas
r.get('/dashboard', authenticate, dashboard.get);
r.get('/transactions', authenticate, txn.list);
// ...

export default r;
```

> **Orden de rutas:** Las rutas con segmentos fijos (`/budgets/copy`, `/budgets/income`) deben declararse **antes** de las rutas con parámetros (`/budgets/:categoryId`) para que Express no los interprete como parámetros.

---

## Variables de entorno

```env
PORT=4000
DB_HOST=localhost
DB_PORT=3306
DB_USER=fintrack_user
DB_PASSWORD=secret
DB_NAME=fintrack
JWT_SECRET=cambiar_en_produccion
JWT_EXPIRES_IN=7d
FRONTEND_URL=http://localhost:5173
ANTHROPIC_API_KEY=sk-ant-...
```

---

## Scripts npm

```json
{
  "scripts": {
    "dev": "node --watch src/index.js",
    "start": "node src/index.js"
  }
}
```

El modo `dev` usa `--watch` nativo de Node.js 18+ para recargar al detectar cambios.
