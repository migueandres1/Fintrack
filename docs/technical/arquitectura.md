# Arquitectura del sistema

## Diagrama general

```
┌─────────────────────────────────────────────────────┐
│                    Cliente (Browser)                  │
│                React SPA (Vite + Tailwind)            │
│   Zustand Store ←→ Axios ←→ /api/*                   │
└───────────────────────────┬─────────────────────────┘
                            │ HTTPS / HTTP
                            │ (Nginx reverse proxy en prod)
┌───────────────────────────▼─────────────────────────┐
│                   Backend (Node.js)                   │
│   Express Router → Middleware → Controllers          │
│   JWT Auth │ Multer │ Helmet │ Rate Limiter          │
└───────────────────────────┬─────────────────────────┘
                            │ mysql2
┌───────────────────────────▼─────────────────────────┐
│                    MySQL 8.0                         │
│   13 tablas relacionales, usuarios aislados por ID   │
└─────────────────────────────────────────────────────┘

                 Servicios externos
┌────────────────────┐    ┌────────────────────────────┐
│  Anthropic API     │    │  (opcional)                │
│  Claude Haiku      │    │  Google Document AI        │
│  OCR de recibos    │    │  (reemplazado por Anthropic)│
└────────────────────┘    └────────────────────────────┘
```

---

## Frontend

### Flujo de datos

```
Usuario → Página (React) → Store Action (Zustand)
       → api.js (Axios) → Backend REST
       ← JSON Response ← Controller
       ← Store Update ← set()
       ← Re-render ←
```

### Routing

React Router v6 con rutas protegidas:

| Ruta | Componente | Acceso |
|------|-----------|--------|
| `/login` | `Login.jsx` | Público |
| `/register` | `Register.jsx` | Público |
| `/onboarding` | `Onboarding.jsx` | Auth sin onboarding |
| `/` | `Dashboard.jsx` | Auth |
| `/transactions` | `Transactions.jsx` | Auth |
| `/accounts` | `Accounts.jsx` | Auth |
| `/debts` | `Debts.jsx` | Auth |
| `/credit-cards` | `CreditCards.jsx` | Auth |
| `/savings` | `Savings.jsx` | Auth |
| `/budget` | `Budget.jsx` | Auth |
| `/planning` | `Planning.jsx` | Auth |
| `/categories` | `Categories.jsx` | Auth |
| `/profile` | `Profile.jsx` | Auth |

### Guards de navegación

```jsx
// RequireAuth: redirige a /login si no hay token
// RequireOnboarding: redirige a / si onboarding ya completado
// RedirectIfAuth: redirige a / si ya está autenticado
```

---

## Backend

### Pipeline de una petición

```
HTTP Request
  └─ Express Router (routes/index.js)
       └─ authenticate middleware (JWT verify)
            └─ [multer middleware si hay archivo]
                 └─ Controller function
                      ├─ pool.query (mysql2)
                      └─ res.json(...)
```

### Módulos del servidor

```javascript
// src/index.js
app.use(helmet())           // Headers de seguridad
app.use(cors({...}))        // CORS configurado
app.use(rateLimit({...}))   // 200 req/15min por IP
app.use('/api', router)     // Todas las rutas bajo /api
app.get('/health', ...)     // Health check
```

### Aislamiento de datos por usuario

Todos los queries incluyen `WHERE user_id = req.userId`. El `userId` se extrae del JWT en el middleware `authenticate` y se adjunta al objeto `req`. Ningún endpoint expone datos de otros usuarios.

---

## Base de datos

### Convenciones

- IDs: `INT UNSIGNED AUTO_INCREMENT`
- Montos: `DECIMAL(14,2)` — soporta hasta 999,999,999,999.99
- Fechas de transacción: `DATE` (sin hora)
- Timestamps de auditoría: `TIMESTAMP DEFAULT CURRENT_TIMESTAMP`
- Monedas: almacenadas como string ISO (USD, GTQ, MXN, etc.)
- Eliminación en cascada habilitada en relaciones hijo → padre

### Aislamiento multi-usuario

Cada tabla con datos de usuario tiene `user_id INT UNSIGNED NOT NULL` con FK a `users(id) ON DELETE CASCADE`. Al eliminar un usuario, todos sus datos se eliminan automáticamente.

---

## Seguridad

| Mecanismo | Implementación |
|-----------|---------------|
| Autenticación | JWT firmado con HS256, expira en 7 días |
| Contraseñas | bcrypt con salt rounds = 10 |
| Headers | Helmet (X-Frame-Options, CSP, HSTS, etc.) |
| Rate limiting | express-rate-limit: 200 req / 15min / IP |
| CORS | Whitelist de origen configurable por ENV |
| SQL injection | mysql2 con prepared statements (?) |
| Archivos | Multer: solo image/* y PDF, máx 10 MB |
