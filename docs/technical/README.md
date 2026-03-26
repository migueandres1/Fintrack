# FinTrack — Documentación Técnica

**FinTrack** es una aplicación web de gestión de finanzas personales construida con una arquitectura cliente-servidor desacoplada. Permite a usuarios individuales llevar control completo de ingresos, gastos, deudas, metas de ahorro y presupuestos mensuales.

---

## Stack tecnológico

| Capa | Tecnología |
|------|-----------|
| Frontend | React 18 + Vite 5 |
| Estilos | Tailwind CSS 3 |
| Estado | Zustand 4 |
| Backend | Node.js 20 + Express 4 |
| Base de datos | MySQL 8.0 |
| Autenticación | JWT + Bcrypt |
| OCR / IA | Claude Haiku (Anthropic API) |
| Contenedores | Docker + Docker Compose |
| Servidor web | Nginx (producción) |

---

## Estructura del monorepo

```
fintrack/
├── backend/          # API REST Node.js/Express
│   ├── src/
│   │   ├── controllers/   # Lógica de negocio
│   │   ├── middleware/    # Auth, validación
│   │   ├── routes/        # Definición de rutas
│   │   ├── config/        # Configuración DB
│   │   └── index.js       # Entry point
│   ├── Dockerfile
│   └── package.json
├── frontend/         # SPA React
│   ├── src/
│   │   ├── pages/         # Vistas por módulo
│   │   ├── components/    # Componentes reutilizables
│   │   ├── store/         # Estado global Zustand
│   │   ├── services/      # Cliente HTTP Axios
│   │   └── utils/         # Helpers
│   ├── Dockerfile
│   └── package.json
├── database/
│   ├── schema.sql         # Esquema completo + seed
│   └── migrations/        # Migraciones incrementales
└── docker-compose.yml
```

---

## Inicio rápido

### Desarrollo local

```bash
# 1. Clonar el proyecto
git clone <repo> && cd fintrack

# 2. Levantar la base de datos
docker-compose up mysql -d

# 3. Backend
cd backend
cp .env.example .env   # Editar variables
npm install
npm run dev            # http://localhost:4000

# 4. Frontend (otra terminal)
cd frontend
npm install
npm run dev            # http://localhost:5173
```

### Con Docker Compose (completo)

```bash
docker-compose up --build
```

Acceso: `http://localhost:5173`
API: `http://localhost:4000`

---

## Variables de entorno requeridas

```env
# Backend (.env)
PORT=4000
DB_HOST=localhost
DB_PORT=3306
DB_USER=fintrack_user
DB_PASSWORD=secret
DB_NAME=fintrack
JWT_SECRET=cambiar_en_produccion
JWT_EXPIRES_IN=7d
FRONTEND_URL=http://localhost:5173
ANTHROPIC_API_KEY=sk-ant-...          # Para OCR de recibos
```
