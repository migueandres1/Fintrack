# Autenticación y seguridad

## Flujo de autenticación

```
1. POST /auth/register o /auth/login
      ↓
2. Controller valida credenciales (bcrypt.compare)
      ↓
3. Se firma un JWT con { userId, email }
      ↓
4. Cliente recibe { token, user } y guarda el token en localStorage
      ↓
5. Cada petición protegida incluye: Authorization: Bearer <token>
      ↓
6. Middleware authenticate() verifica la firma y adjunta req.userId
      ↓
7. Controller ejecuta con req.userId garantizado
```

---

## JWT

| Propiedad | Valor |
|-----------|-------|
| Algoritmo | HS256 |
| Expiración | 7 días (`JWT_EXPIRES_IN=7d`) |
| Payload | `{ userId, email, iat, exp }` |
| Secret | Variable de entorno `JWT_SECRET` |

### Middleware `authenticate`

```javascript
// backend/src/middleware/auth.js
import jwt from 'jsonwebtoken';

export function authenticate(req, res, next) {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) return res.status(401).json({ error: 'No token' });

  const token = header.slice(7);
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    req.userId = payload.userId;
    next();
  } catch {
    res.status(401).json({ error: 'Token inválido o expirado' });
  }
}
```

El `userId` inyectado en `req` es la única fuente de verdad para el aislamiento de datos. Todos los queries usan `WHERE user_id = req.userId`.

---

## Contraseñas

- Hash con **bcrypt**, salt rounds = 10.
- Nunca se almacena ni se devuelve la contraseña en texto plano.
- En el endpoint `PUT /auth/password` se verifica la contraseña actual antes de actualizar.

```javascript
const match = await bcrypt.compare(current_password, user.password_hash);
if (!match) return res.status(400).json({ error: 'Contraseña actual incorrecta' });
const hash = await bcrypt.hash(new_password, 10);
```

---

## Headers de seguridad (Helmet)

Helmet aplica automáticamente estos headers HTTP:

| Header | Descripción |
|--------|-------------|
| `X-Frame-Options: DENY` | Previene clickjacking |
| `X-Content-Type-Options: nosniff` | Previene MIME sniffing |
| `Content-Security-Policy` | Política de carga de recursos |
| `Strict-Transport-Security` | Fuerza HTTPS (HSTS) |
| `X-XSS-Protection` | Protección básica XSS en browsers antiguos |

---

## Rate limiting

```javascript
rateLimit({
  windowMs: 15 * 60 * 1000,  // 15 minutos
  max: 200,                    // máximo 200 requests por IP
  standardHeaders: true,
  legacyHeaders: false,
})
```

Se aplica globalmente a todas las rutas `/api/*`.

---

## CORS

```javascript
cors({
  origin: process.env.FRONTEND_URL,  // Ej: http://localhost:5173
  credentials: true
})
```

Solo se permite el origen configurado en `FRONTEND_URL`. En producción se debe usar el dominio real.

---

## Protección SQL injection

Todos los queries usan **prepared statements** de mysql2:

```javascript
// ✅ Correcto — parámetros escapados automáticamente
pool.query('SELECT * FROM users WHERE id = ?', [req.userId]);

// ❌ Nunca se hace interpolación directa
pool.query(`SELECT * FROM users WHERE id = ${req.userId}`);
```

---

## Aislamiento multi-usuario

Cada tabla de datos tiene `user_id` con FK a `users(id) ON DELETE CASCADE`. El middleware garantiza que `req.userId` corresponde al token firmado, y todos los controllers filtran por este valor. No existe ningún endpoint que devuelva datos de otros usuarios.
