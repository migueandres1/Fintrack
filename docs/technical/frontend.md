# Frontend

## Stack

| Componente | Tecnología |
|------------|-----------|
| Framework | React 18 |
| Build | Vite 5 |
| Estilos | Tailwind CSS 3 |
| Estado | Zustand 4 |
| HTTP | Axios |
| Routing | React Router v6 |
| Iconos | Lucide React |

---

## Estructura de directorios

```
frontend/src/
├── App.jsx               # Router principal y rutas
├── main.jsx              # Entry point React
├── index.css             # Tailwind base + globales
├── pages/
│   ├── Dashboard.jsx
│   ├── Transactions.jsx
│   ├── Accounts.jsx
│   ├── Debts.jsx
│   ├── CreditCards.jsx
│   ├── Savings.jsx
│   ├── Budget.jsx
│   ├── Planning.jsx
│   ├── Categories.jsx
│   ├── Profile.jsx
│   ├── Login.jsx
│   ├── Register.jsx
│   └── Onboarding.jsx
├── components/
│   ├── layout/
│   │   └── AppLayout.jsx   # Sidebar + mobile nav
│   └── ui/
│       └── index.jsx        # Componentes UI reutilizables
├── store/
│   └── index.js             # Zustand store global
├── services/
│   └── api.js               # Instancia Axios configurada
└── utils/
    └── (helpers)
```

---

## Cliente HTTP (`services/api.js`)

```javascript
import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:4000/api',
});

// Inyecta el token JWT en cada request
api.interceptors.request.use(config => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Redirige al login si el servidor responde 401
api.interceptors.response.use(
  res => res,
  err => {
    if (err.response?.status === 401) {
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    return Promise.reject(err);
  }
);

export default api;
```

---

## Renderizado dinámico de iconos Lucide

Los iconos se almacenan en la base de datos como nombres kebab-case (`heart-pulse`, `dumbbell`). Para renderizarlos dinámicamente:

```javascript
import * as LucideIcons from 'lucide-react';

// Convierte "heart-pulse" → "HeartPulse"
function toPascal(name) {
  return name.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join('');
}

function LucideIcon({ name, ...props }) {
  const Icon = LucideIcons[toPascal(name)] || LucideIcons['Tag'];
  return <Icon {...props} />;
}
```

---

## Guards de navegación

```jsx
// RequireAuth — redirige a /login si no hay token
function RequireAuth({ children }) {
  const token = localStorage.getItem('token');
  return token ? children : <Navigate to="/login" replace />;
}

// RequireOnboarding — redirige a / si el onboarding ya fue completado
function RequireOnboarding({ children }) {
  const { user } = useStore();
  return user?.onboarding_completed ? <Navigate to="/" replace /> : children;
}

// RedirectIfAuth — redirige a / si ya está autenticado
function RedirectIfAuth({ children }) {
  const token = localStorage.getItem('token');
  return token ? <Navigate to="/" replace /> : children;
}
```

---

## Routing (`App.jsx`)

```jsx
<Routes>
  {/* Públicas */}
  <Route path="/login" element={<RedirectIfAuth><Login /></RedirectIfAuth>} />
  <Route path="/register" element={<RedirectIfAuth><Register /></RedirectIfAuth>} />
  <Route path="/onboarding" element={
    <RequireAuth><RequireOnboarding><Onboarding /></RequireOnboarding></RequireAuth>
  } />

  {/* Protegidas */}
  <Route path="/" element={<RequireAuth><AppLayout /></RequireAuth>}>
    <Route index element={<Dashboard />} />
    <Route path="transactions" element={<Transactions />} />
    <Route path="accounts" element={<Accounts />} />
    <Route path="debts" element={<Debts />} />
    <Route path="credit-cards" element={<CreditCards />} />
    <Route path="savings" element={<Savings />} />
    <Route path="budget" element={<Budget />} />
    <Route path="planning" element={<Planning />} />
    <Route path="categories" element={<Categories />} />
    <Route path="profile" element={<Profile />} />
  </Route>
</Routes>
```

---

## Layout (`AppLayout.jsx`)

- Sidebar fijo en desktop (≥768px) con navegación principal
- Bottom nav en móvil con ítems principales + menú "Más"
- Logo, usuario activo, y botón de logout

Los ítems de navegación se definen como arrays de `{ to, icon, label }`:

```javascript
const NAV = [
  { to: '/',             icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/transactions', icon: ArrowLeftRight,  label: 'Transacciones' },
  { to: '/accounts',     icon: Wallet,          label: 'Cuentas' },
  { to: '/debts',        icon: CreditCard,      label: 'Deudas' },
  { to: '/savings',      icon: PiggyBank,       label: 'Ahorros' },
  { to: '/budget',       icon: BarChart2,       label: 'Presupuesto' },
  { to: '/categories',   icon: Tags,            label: 'Categorías' },
  { to: '/profile',      icon: Settings,        label: 'Perfil' },
];
```

---

## Variables de entorno

```env
# frontend/.env
VITE_API_URL=http://localhost:4000/api
```

En producción se cambia a la URL real del backend.

---

## Scripts npm

```json
{
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview"
  }
}
```
