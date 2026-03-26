# Base de datos

**Motor:** MySQL 8.0
**Charset:** utf8mb4 / utf8mb4_unicode_ci
**Nombre:** `fintrack`

---

## Diagrama de relaciones

```
users
 ├── categories (user_id nullable → NULL = sistema)
 ├── transactions
 │    ├── → categories (category_id)
 │    ├── → credit_cards (credit_card_id nullable)
 │    ├── → bank_accounts (account_id nullable)
 │    └── → savings_goals (savings_goal_id nullable)
 ├── debts
 │    ├── debt_payments (debt_id)
 │    └── debt_planned_payments (debt_id)
 ├── credit_cards
 ├── bank_accounts
 ├── savings_goals
 │    └── savings_contributions (goal_id)
 ├── recurring_transactions
 ├── budgets
 ├── budget_planned_income
 └── user_hidden_categories
```

---

## Tablas

### `users`
Usuarios del sistema.

| Columna | Tipo | Descripción |
|---------|------|-------------|
| `id` | INT UNSIGNED PK | Auto-increment |
| `name` | VARCHAR(120) | Nombre completo |
| `email` | VARCHAR(180) UNIQUE | Email de login |
| `password_hash` | VARCHAR(255) | Hash bcrypt |
| `currency` | CHAR(3) | Moneda preferida (USD, GTQ…) |
| `dark_mode` | TINYINT(1) | 0=claro, 1=oscuro |
| `onboarding_completed` | TINYINT(1) | 0=pendiente, 1=completado |
| `created_at` | TIMESTAMP | Fecha de registro |
| `updated_at` | TIMESTAMP | Última actualización |

---

### `categories`
Categorías de ingresos y gastos. Las del sistema tienen `user_id = NULL`.

| Columna | Tipo | Descripción |
|---------|------|-------------|
| `id` | INT UNSIGNED PK | |
| `user_id` | INT UNSIGNED NULL | NULL = categoría del sistema |
| `name` | VARCHAR(80) | Nombre |
| `type` | ENUM('income','expense') | Tipo |
| `icon` | VARCHAR(40) | Nombre del icono Lucide |
| `color` | CHAR(7) | Color hex (#rrggbb) |

**Categorías del sistema (predeterminadas):**

| Tipo | Categorías |
|------|-----------|
| income | Salario, Freelance, Inversiones, Otros ingresos, Remesas |
| expense | Alimentación, Transporte, Vivienda, Salud, Educación, Entretenimiento, Ropa, Servicios, Deuda, Ejercicio, Otros gastos |

---

### `user_hidden_categories`
Permite que un usuario oculte categorías del sistema de su vista sin eliminarlas para todos.

| Columna | Tipo |
|---------|------|
| `user_id` | INT UNSIGNED (PK compuesta) |
| `category_id` | INT UNSIGNED (PK compuesta) |

FK en cascada a `users` y `categories`.

---

### `transactions`
Registro central de movimientos financieros.

| Columna | Tipo | Descripción |
|---------|------|-------------|
| `id` | INT UNSIGNED PK | |
| `user_id` | INT UNSIGNED | Propietario |
| `category_id` | INT UNSIGNED | Categoría |
| `type` | ENUM('income','expense') | |
| `amount` | DECIMAL(14,2) | Siempre positivo |
| `description` | VARCHAR(255) | Descripción |
| `txn_date` | DATE | Fecha de la transacción |
| `credit_card_id` | INT UNSIGNED NULL | Si fue con tarjeta |
| `account_id` | INT UNSIGNED NULL | Cuenta bancaria usada |
| `savings_goal_id` | INT UNSIGNED NULL | Meta de ahorro asociada |
| `is_card_payment` | TINYINT(1) | 1 = pago de deuda de tarjeta |
| `extra_principal` | DECIMAL(14,2) | Abono extra a capital (deudas) |
| `created_at` | TIMESTAMP | |

> **Nota de diseño:** Los gastos con tarjeta de crédito (`credit_card_id IS NOT NULL` y `is_card_payment = 0`) no reducen el balance hasta que se registra el pago (`is_card_payment = 1`). Esto permite tener el balance real en cuentas separado del saldo pendiente en tarjetas.

---

### `credit_cards`
Tarjetas de crédito del usuario.

| Columna | Tipo | Descripción |
|---------|------|-------------|
| `id` | INT UNSIGNED PK | |
| `user_id` | INT UNSIGNED | |
| `name` | VARCHAR(120) | Ej: "Visa Platinum" |
| `last_four` | CHAR(4) NULL | Últimos 4 dígitos |
| `credit_limit` | DECIMAL(14,2) NULL | Límite de crédito |
| `billing_day` | TINYINT | Día de corte |
| `due_day` | TINYINT | Día de pago |
| `color` | CHAR(7) | Color para UI |
| `notes` | TEXT NULL | Notas adicionales |

---

### `bank_accounts`
Cuentas bancarias y efectivo.

| Columna | Tipo | Descripción |
|---------|------|-------------|
| `id` | INT UNSIGNED PK | |
| `user_id` | INT UNSIGNED | |
| `name` | VARCHAR(120) | Ej: "Cuenta corriente BAC" |
| `type` | ENUM('checking','savings','cash','investment') | |
| `initial_balance` | DECIMAL(14,2) | Saldo inicial |
| `currency` | CHAR(3) | Moneda de la cuenta |
| `color` | CHAR(7) | Color para UI |
| `is_active` | TINYINT(1) | 1 = activa |

---

### `debts`
Préstamos y deudas con amortización.

| Columna | Tipo | Descripción |
|---------|------|-------------|
| `id` | INT UNSIGNED PK | |
| `user_id` | INT UNSIGNED | |
| `credit_card_id` | INT UNSIGNED NULL | Si la deuda es de una tarjeta |
| `name` | VARCHAR(120) | Nombre del préstamo |
| `initial_balance` | DECIMAL(14,2) | Monto original |
| `current_balance` | DECIMAL(14,2) | Saldo pendiente |
| `annual_rate` | DECIMAL(6,4) | Tasa anual (ej: 0.18 = 18%) |
| `monthly_payment` | DECIMAL(14,2) | Cuota mensual |
| `payment_day` | TINYINT UNSIGNED | Día de pago (1–31) |
| `start_date` | DATE | Fecha de inicio |
| `is_active` | TINYINT(1) | 1 = activa |
| `notes` | TEXT NULL | |

---

### `debt_payments`
Historial de pagos realizados a una deuda.

| Columna | Tipo | Descripción |
|---------|------|-------------|
| `id` | INT UNSIGNED PK | |
| `debt_id` | INT UNSIGNED | |
| `transaction_id` | INT UNSIGNED NULL | Transacción asociada |
| `payment_date` | DATE | |
| `total_amount` | DECIMAL(14,2) | Total pagado |
| `principal_paid` | DECIMAL(14,2) | Abono a capital |
| `interest_paid` | DECIMAL(14,2) | Intereses pagados |
| `extra_principal` | DECIMAL(14,2) | Abono extra |
| `balance_after` | DECIMAL(14,2) | Saldo después del pago |
| `notes` | TEXT NULL | |

---

### `debt_planned_payments`
Pagos planificados futuros de una deuda.

| Columna | Tipo |
|---------|------|
| `id` | INT UNSIGNED PK |
| `debt_id` | INT UNSIGNED |
| `planned_date` | DATE |
| `amount` | DECIMAL(14,2) |
| `notes` | VARCHAR(255) NULL |

---

### `savings_goals`
Metas de ahorro con seguimiento de progreso.

| Columna | Tipo | Descripción |
|---------|------|-------------|
| `id` | INT UNSIGNED PK | |
| `user_id` | INT UNSIGNED | |
| `name` | VARCHAR(120) | Nombre de la meta |
| `target_amount` | DECIMAL(14,2) | Monto objetivo |
| `current_amount` | DECIMAL(14,2) | Ahorrado hasta ahora |
| `deadline` | DATE NULL | Fecha límite |
| `icon` | VARCHAR(40) | Nombre icono Lucide |
| `color` | CHAR(7) | Color hex |
| `is_completed` | TINYINT(1) | 1 = completada |

---

### `savings_contributions`
Aportes individuales a una meta de ahorro.

| Columna | Tipo |
|---------|------|
| `id` | INT UNSIGNED PK |
| `goal_id` | INT UNSIGNED |
| `transaction_id` | INT UNSIGNED NULL |
| `amount` | DECIMAL(14,2) |
| `contrib_date` | DATE |
| `notes` | VARCHAR(255) NULL |

> Al agregar o eliminar un aporte, el backend recalcula `current_amount` y `is_completed` en `savings_goals` automáticamente.

---

### `recurring_transactions`
Plantillas de transacciones periódicas.

| Columna | Tipo | Descripción |
|---------|------|-------------|
| `id` | INT UNSIGNED PK | |
| `user_id` | INT UNSIGNED | |
| `category_id` | INT UNSIGNED | |
| `type` | ENUM('income','expense') | |
| `amount` | DECIMAL(14,2) | |
| `description` | VARCHAR(255) NULL | |
| `frequency` | ENUM('weekly','biweekly','monthly','yearly') | |
| `start_date` | DATE | Inicio de la recurrencia |
| `next_date` | DATE | Próxima ejecución |
| `end_date` | DATE NULL | Fin (null = indefinido) |
| `is_active` | TINYINT(1) | |
| `savings_goal_id` | INT UNSIGNED NULL | Meta de ahorro vinculada |
| `credit_card_id` | INT UNSIGNED NULL | Tarjeta vinculada |

---

### `budgets`
Presupuesto mensual por categoría de gasto.

| Columna | Tipo | Descripción |
|---------|------|-------------|
| `id` | INT UNSIGNED PK | |
| `user_id` | INT UNSIGNED | |
| `category_id` | INT UNSIGNED | |
| `amount` | DECIMAL(14,2) | Monto presupuestado |
| `month` | CHAR(7) | Formato YYYY-MM |
| `created_at` | TIMESTAMP | |
| `updated_at` | TIMESTAMP | |

UNIQUE KEY en `(user_id, category_id, month)`.

---

### `budget_planned_income`
Ingresos únicos planificados para un mes en el contexto del presupuesto.

| Columna | Tipo |
|---------|------|
| `id` | INT UNSIGNED PK |
| `user_id` | INT UNSIGNED |
| `month` | CHAR(7) |
| `description` | VARCHAR(120) |
| `amount` | DECIMAL(14,2) |
| `created_at` | TIMESTAMP |
