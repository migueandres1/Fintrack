# API REST — Referencia completa

**Base URL:** `http://localhost:4000/api`

Todas las rutas protegidas requieren:
```
Authorization: Bearer <jwt_token>
```

---

## Autenticación

### `POST /auth/register`
Registra un nuevo usuario.

**Body:**
```json
{
  "name": "Miguel López",
  "email": "miguel@example.com",
  "password": "min8chars",
  "currency": "USD"
}
```

**Respuesta 201:**
```json
{ "token": "eyJ...", "user": { "id": 1, "name": "Miguel López", "email": "...", "currency": "USD" } }
```

---

### `POST /auth/login`
Inicia sesión.

**Body:** `{ "email": "...", "password": "..." }`

**Respuesta 200:** Igual que register.

---

### `GET /auth/me` 🔒
Retorna el usuario autenticado.

---

### `PUT /auth/profile` 🔒
Actualiza nombre y moneda.

**Body:** `{ "name": "...", "currency": "GTQ" }`

---

### `PUT /auth/password` 🔒
Cambia la contraseña.

**Body:** `{ "current_password": "...", "new_password": "..." }`

---

### `PUT /auth/onboarding/complete` 🔒
Marca el onboarding como completado.

---

## Dashboard

### `GET /dashboard` 🔒
Retorna un resumen completo del estado financiero.

**Respuesta:**
```json
{
  "balance": {
    "total": 5230.50,
    "total_income": 8000.00,
    "total_expenses": 2769.50
  },
  "this_month": { "income": 2000.00, "expenses": 450.00 },
  "monthly_trend": [ { "month": "2026-01", "income": 2000, "expenses": 380 } ],
  "debts": [...],
  "total_debt": 4174.53,
  "goals": [...],
  "recent_transactions": [...],
  "score": {
    "total": 72,
    "dimensions": { "liquidez": 20, "ahorro": 18, "deuda": 22, "metas": 12 }
  }
}
```

> El score financiero (0–100) evalúa liquidez, tasa de ahorro, nivel de deuda y progreso de metas.

---

## Transacciones

### `GET /transactions` 🔒
Lista transacciones con filtros y paginación.

**Query params:**
| Param | Tipo | Descripción |
|-------|------|-------------|
| `page` | number | Página (default 1) |
| `limit` | number | Por página (default 20) |
| `type` | string | `income` \| `expense` |
| `category_id` | number | Filtrar por categoría |
| `month` | string | Formato YYYY-MM |
| `search` | string | Buscar en descripción |

**Respuesta:** `{ "data": [...], "total": 42, "page": 1, "pages": 3 }`

---

### `POST /transactions` 🔒
Crea una transacción.

**Body:**
```json
{
  "category_id": 5,
  "type": "expense",
  "amount": 45.50,
  "description": "Supermercado",
  "txn_date": "2026-03-15",
  "credit_card_id": null,
  "account_id": 1
}
```

---

### `PUT /transactions/:id` 🔒
Actualiza una transacción propia.

### `DELETE /transactions/:id` 🔒
Elimina una transacción propia.

### `GET /transactions/summary` 🔒
Retorna totales agrupados por mes y categoría.

### `GET /transactions/export` 🔒
Descarga CSV con todas las transacciones del usuario.

---

## Categorías

### `GET /categories` 🔒
Lista categorías visibles (excluye ocultas). Usado en formularios de transacciones.

### `GET /categories/manage` 🔒
Lista todas las categorías con flags `source` (`default`|`custom`) e `is_hidden`.

### `POST /categories` 🔒
Crea categoría personalizada.

**Body:** `{ "name": "Gimnasio", "type": "expense", "icon": "dumbbell", "color": "#ef4444" }`

### `PUT /categories/:id` 🔒
Edita categoría propia (no del sistema).

### `DELETE /categories/:id` 🔒
Elimina categoría propia.

### `POST /categories/:id/hide` 🔒
Oculta una categoría del sistema para el usuario.

### `DELETE /categories/:id/hide` 🔒
Muestra nuevamente una categoría del sistema oculta.

---

## Deudas

### `GET /debts` 🔒
Lista todas las deudas del usuario.

### `POST /debts` 🔒
```json
{
  "name": "Préstamo banco",
  "initial_balance": 10000,
  "annual_rate": 0.18,
  "monthly_payment": 200,
  "payment_day": 5,
  "start_date": "2025-01-01"
}
```

### `GET /debts/:id` 🔒
Detalle de una deuda con historial de pagos y proyección de amortización.

### `PUT /debts/:id` 🔒 | `DELETE /debts/:id` 🔒

### `POST /debts/:id/payments` 🔒
Registra un pago a la deuda. Recalcula saldo automáticamente.

```json
{
  "amount": 200,
  "payment_date": "2026-03-05",
  "extra_principal": 50
}
```

### `GET /debts/:id/payments` 🔒
Historial de pagos.

### `POST /debts/:id/planned` 🔒
Agrega un pago planificado futuro.

### `DELETE /debts/:id/planned/:plannedId` 🔒
Elimina un pago planificado.

---

## Metas de ahorro

### `GET /savings` 🔒
Lista todas las metas.

### `POST /savings` 🔒
```json
{
  "name": "Viaje a Colombia",
  "target_amount": 1000,
  "deadline": "2026-06-26",
  "icon": "plane",
  "color": "#3b82f6"
}
```

### `GET /savings/:id` 🔒
Detalle de la meta con historial de aportes.

### `PUT /savings/:id` 🔒 | `DELETE /savings/:id` 🔒

### `POST /savings/:id/contributions` 🔒
Agrega un aporte. Actualiza `current_amount` e `is_completed` automáticamente.

```json
{ "amount": 100, "contrib_date": "2026-03-15", "notes": "Ahorro mensual" }
```

### `PUT /savings/contributions/:contribId` 🔒
Edita un aporte. Recalcula el total de la meta.

### `DELETE /savings/contributions/:contribId` 🔒
Elimina un aporte. Recalcula el total.

---

## Transacciones recurrentes

### `GET /recurring` 🔒
Lista recurrentes activas e inactivas.

### `POST /recurring` 🔒
```json
{
  "category_id": 7,
  "type": "expense",
  "amount": 12.00,
  "description": "Netflix",
  "frequency": "monthly",
  "start_date": "2025-01-01"
}
```

`frequency`: `weekly` | `biweekly` | `monthly` | `yearly`

### `PUT /recurring/:id` 🔒 | `DELETE /recurring/:id` 🔒

---

## Tarjetas de crédito

### `GET /credit-cards` 🔒
### `POST /credit-cards` 🔒
```json
{
  "name": "Visa Platinum",
  "last_four": "4242",
  "credit_limit": 5000,
  "billing_day": 15,
  "due_day": 5,
  "color": "#6366f1"
}
```
### `PUT /credit-cards/:id` 🔒 | `DELETE /credit-cards/:id` 🔒
### `GET /credit-cards/:id/transactions` 🔒
### `POST /credit-cards/:id/payments` 🔒

---

## Cuentas bancarias

### `GET /accounts` 🔒
### `POST /accounts` 🔒
```json
{
  "name": "Cuenta corriente BAC",
  "type": "checking",
  "initial_balance": 2500,
  "currency": "USD",
  "color": "#3b82f6"
}
```
`type`: `checking` | `savings` | `cash` | `investment`

### `PUT /accounts/:id` 🔒 | `DELETE /accounts/:id` 🔒
### `GET /accounts/:id/transactions` 🔒

---

## Presupuesto

### `GET /budgets?month=YYYY-MM` 🔒
Retorna presupuesto del mes con gasto real, recurrentes, deudas, metas e ingresos planificados.

**Respuesta:**
```json
{
  "month": "2026-03",
  "items": [{ "category_id": 5, "category_name": "Alimentación", "budget": 400, "spent": 220 }],
  "categories": [...],
  "recurring": [...],
  "debts": [...],
  "goals": [...],
  "planned_income": [...]
}
```

### `PUT /budgets` 🔒
Crea o actualiza (upsert) un presupuesto.

```json
{ "category_id": 5, "amount": 400, "month": "2026-03" }
```

### `DELETE /budgets/:categoryId?month=YYYY-MM` 🔒
### `POST /budgets/copy` 🔒
Copia el presupuesto del mes anterior al mes indicado.

```json
{ "targetMonth": "2026-04" }
```

### `GET /budgets/:categoryId/transactions?month=YYYY-MM` 🔒
Lista las transacciones de una categoría en el mes.

### `POST /budgets/income` 🔒
Agrega un ingreso planificado único para el mes.

```json
{ "month": "2026-03", "description": "Salario", "amount": 2000 }
```

### `DELETE /budgets/income/:id` 🔒

---

## OCR de recibos

### `POST /ocr/receipt` 🔒
Procesa una imagen o PDF de recibo con Claude Haiku y extrae los datos.

**Request:** `multipart/form-data` con campo `receipt` (image/*, application/pdf, máx 10 MB)

**Respuesta:**
```json
{
  "merchant": "Walmart",
  "amount": 45.20,
  "date": "2026-03-15",
  "currency": "USD",
  "line_items": [
    { "description": "Leche entera", "amount": 3.50, "quantity": "2" }
  ]
}
```

> La imagen es comprimida en el frontend (máx 1920px, JPEG 82%) respetando la orientación EXIF antes de enviarse al servidor.

---

## Salud del servidor

### `GET /health`
No requiere autenticación. Responde `{ "status": "ok" }`.
