# 💰 FinTrack – Finanzas Personales

Aplicación web completa para control de finanzas personales: transacciones, deudas con amortización real, y metas de ahorro.

---

## 🗂 Estructura del proyecto

```
fintrack/
├── backend/                # API Node.js + Express
│   ├── src/
│   │   ├── config/db.js         # Pool MySQL
│   │   ├── controllers/         # Lógica de negocio
│   │   ├── middleware/auth.js   # JWT middleware
│   │   ├── routes/index.js      # Todas las rutas API
│   │   ├── utils/amortization.js # Cálculos de deuda
│   │   └── index.js             # Entry point Express
│   ├── .env.example
│   ├── Dockerfile
│   └── package.json
│
├── frontend/               # React + Vite + TailwindCSS
│   ├── src/
│   │   ├── components/
│   │   │   ├── layout/AppLayout.jsx  # Sidebar + navegación
│   │   │   └── ui/index.jsx          # Modal, StatCard, etc.
│   │   ├── pages/
│   │   │   ├── Dashboard.jsx
│   │   │   ├── Transactions.jsx
│   │   │   ├── Debts.jsx
│   │   │   └── Savings.jsx
│   │   ├── store/index.js      # Zustand global state
│   │   ├── services/api.js     # Axios client
│   │   └── utils/format.js     # Formateo de fechas/monedas
│   ├── Dockerfile
│   └── package.json
│
├── database/
│   └── schema.sql          # Schema + seed data
│
└── docker-compose.yml      # Levanta todo con un comando
```

---

## 🚀 Opción 1: Docker Compose (recomendado)

### Requisitos
- Docker Desktop instalado

### Pasos

```bash
# 1. Clonar / descomprimir el proyecto
cd fintrack

# 2. Levantar todos los servicios
docker compose up -d

# 3. Esperar ~30 segundos a que MySQL inicialice
# Luego abrir http://localhost:5173
```

**Credenciales demo:**
- Email: `demo@fintrack.app`
- Contraseña: `12345678`

---

## 🔧 Opción 2: Instalación manual

### Requisitos previos
- Node.js 20+
- MySQL 8.0 (local o remoto)

### 1. Base de datos

```bash
# Crear la base de datos y cargar el schema con datos demo
mysql -u root -p < database/schema.sql
```

### 2. Backend

```bash
cd backend

# Instalar dependencias
npm install

# Configurar variables de entorno
cp .env.example .env
# Editar .env con tus datos de MySQL y JWT_SECRET

# Iniciar en modo desarrollo
npm run dev
# → API disponible en http://localhost:4000
```

### 3. Frontend

```bash
cd frontend

# Instalar dependencias
npm install

# Iniciar en modo desarrollo
npm run dev
# → App disponible en http://localhost:5173
```

---

## 🌐 API REST – Referencia rápida

### Auth
| Método | Ruta               | Descripción           |
|--------|--------------------|-----------------------|
| POST   | `/api/auth/register` | Registro de usuario  |
| POST   | `/api/auth/login`    | Login → JWT          |
| GET    | `/api/auth/me`       | Perfil autenticado   |
| PUT    | `/api/auth/profile`  | Actualizar perfil    |

### Dashboard
| GET | `/api/dashboard` | Resumen completo |

### Transacciones
| Método | Ruta                        | Descripción             |
|--------|-----------------------------|-------------------------|
| GET    | `/api/transactions`         | Lista (con filtros)     |
| POST   | `/api/transactions`         | Crear                   |
| PUT    | `/api/transactions/:id`     | Editar                  |
| DELETE | `/api/transactions/:id`     | Eliminar                |
| GET    | `/api/transactions/summary` | Resumen por mes/categoría |
| GET    | `/api/transactions/export`  | Exportar CSV            |
| GET    | `/api/categories`           | Lista de categorías     |

### Deudas
| Método | Ruta                        | Descripción                  |
|--------|-----------------------------|------------------------------|
| GET    | `/api/debts`                | Lista con proyección         |
| POST   | `/api/debts`                | Crear deuda                  |
| GET    | `/api/debts/:id`            | Detalle + pagos + proyección |
| PUT    | `/api/debts/:id`            | Editar                       |
| DELETE | `/api/debts/:id`            | Eliminar                     |
| POST   | `/api/debts/:id/payments`   | Registrar pago (normal o extra capital) |
| GET    | `/api/debts/:id/payments`   | Historial de pagos           |

### Metas de ahorro
| Método | Ruta                              | Descripción       |
|--------|-----------------------------------|-------------------|
| GET    | `/api/savings`                    | Lista de metas    |
| POST   | `/api/savings`                    | Crear meta        |
| GET    | `/api/savings/:id`                | Detalle + aportes |
| PUT    | `/api/savings/:id`                | Editar            |
| DELETE | `/api/savings/:id`                | Eliminar          |
| POST   | `/api/savings/:id/contributions`  | Registrar aporte  |

---

## 💡 Lógica de amortización

El archivo `backend/src/utils/amortization.js` implementa:

- **Amortización francesa** (cuota fija)
- **Abonos extra a capital**: se aplican directamente al saldo, reduciendo intereses futuros y acortando el plazo
- **Tabla de amortización completa**: período por período con desglose capital/interés
- **Proyección de payoff**: fecha estimada de cancelación total e intereses totales

### Ejemplo de pago extra

```
Deuda: $10,000 | Tasa: 18% anual | Cuota: $320/mes
→ Sin extras: 42 meses, $3,440 en intereses

Abono extra de $500 en mes 6:
→ 38 meses (-4), $2,890 en intereses (-$550)
```

---

## 🎨 Stack tecnológico

| Capa       | Tecnología                              |
|------------|-----------------------------------------|
| Frontend   | React 18, Vite, TailwindCSS, Recharts   |
| Estado     | Zustand (con persistencia localStorage) |
| Backend    | Node.js, Express, JWT, bcrypt           |
| Base datos | MySQL 8 con pool mysql2                 |
| DevOps     | Docker, Docker Compose, Nginx           |
| Tipografía | DM Sans, Syne, DM Mono (Google Fonts)   |

---

## ✅ Funcionalidades implementadas

- [x] Autenticación JWT (login/registro)
- [x] Dashboard con gráficas de área e indicadores clave
- [x] CRUD completo de transacciones
- [x] Filtros por tipo, categoría y fecha
- [x] Gráficas mensuales de ingresos vs gastos
- [x] Top categorías de gasto
- [x] Exportación CSV de transacciones
- [x] CRUD completo de deudas
- [x] Cálculo de amortización francesa
- [x] Pagos extra a capital con recálculo
- [x] Historial de pagos por deuda
- [x] Proyección de payoff (gráfica + fecha)
- [x] CRUD de metas de ahorro
- [x] Registro de aportes con historial
- [x] Barra de progreso y proyección mensual
- [x] Modo oscuro (toggle + persistencia)
- [x] Diseño responsive / mobile-first
- [x] Multi-moneda (USD, EUR, GTQ, etc.)
- [x] PWA manifest (instalable)
- [x] Seed data de ejemplo listo para demo
