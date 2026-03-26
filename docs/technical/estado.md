# Estado global (Zustand)

## Descripción

El estado global de la aplicación se gestiona con **Zustand 4**. Todo el estado y las acciones se definen en un único store (`src/store/index.js`).

---

## Estructura del store

```javascript
// src/store/index.js
import { create } from 'zustand';
import api from '../services/api';

const useStore = create((set, get) => ({
  // --- Estado ---
  user: null,
  token: localStorage.getItem('token'),

  transactions: [],
  txnLoading: false,
  txnTotal: 0,
  txnPages: 1,

  categories: [],          // Solo visibles (para formularios)
  allCategories: [],        // Todas (para gestión)
  catsLoading: false,

  debts: [],
  debtDetail: null,

  savings: [],
  savingsLoading: false,

  recurring: [],

  creditCards: [],
  accounts: [],

  budget: {
    month: '',
    items: [],
    categories: [],
    recurring: [],
    debts: [],
    goals: [],
    planned_income: [],
  },

  dashboard: null,

  // --- Acciones ---
  // ...
}));
```

---

## Acciones de autenticación

| Acción | Descripción |
|--------|-------------|
| `login(email, password)` | POST /auth/login, guarda token y user |
| `register(data)` | POST /auth/register, igual que login |
| `logout()` | Limpia token, user y localStorage |
| `fetchMe()` | GET /auth/me, actualiza user en store |
| `updateProfile(data)` | PUT /auth/profile |
| `changePassword(data)` | PUT /auth/password |
| `completeOnboarding()` | PUT /auth/onboarding/complete |

```javascript
login: async (email, password) => {
  const { data } = await api.post('/auth/login', { email, password });
  localStorage.setItem('token', data.token);
  set({ token: data.token, user: data.user });
},
```

---

## Acciones de transacciones

| Acción | Descripción |
|--------|-------------|
| `fetchTransactions(params)` | GET /transactions con filtros |
| `createTransaction(data)` | POST /transactions |
| `updateTransaction(id, data)` | PUT /transactions/:id |
| `deleteTransaction(id)` | DELETE /transactions/:id |

---

## Acciones de categorías

| Acción | Descripción |
|--------|-------------|
| `fetchCategories()` | GET /categories (solo visibles) |
| `fetchAllCategories()` | GET /categories/manage (todas + flags) |
| `createCategory(data)` | POST /categories |
| `updateCategory(id, data)` | PUT /categories/:id |
| `deleteCategory(id)` | DELETE /categories/:id |
| `hideCategory(id)` | POST /categories/:id/hide |
| `unhideCategory(id)` | DELETE /categories/:id/hide |

---

## Acciones de deudas

| Acción | Descripción |
|--------|-------------|
| `fetchDebts()` | GET /debts |
| `fetchDebtDetail(id)` | GET /debts/:id |
| `createDebt(data)` | POST /debts |
| `updateDebt(id, data)` | PUT /debts/:id |
| `deleteDebt(id)` | DELETE /debts/:id |
| `addDebtPayment(id, data)` | POST /debts/:id/payments |

---

## Acciones de metas de ahorro

| Acción | Descripción |
|--------|-------------|
| `fetchGoals()` | GET /savings |
| `createGoal(data)` | POST /savings |
| `updateGoal(id, data)` | PUT /savings/:id |
| `deleteGoal(id)` | DELETE /savings/:id |
| `addContribution(id, data)` | POST /savings/:id/contributions |
| `updateContribution(contribId, data)` | PUT /savings/contributions/:id |
| `deleteContribution(contribId)` | DELETE /savings/contributions/:id |

---

## Acciones de presupuesto

| Acción | Descripción |
|--------|-------------|
| `fetchBudget(month)` | GET /budgets?month=YYYY-MM |
| `upsertBudget(data)` | PUT /budgets |
| `deleteBudget(categoryId, month)` | DELETE /budgets/:id?month= |
| `copyBudget(targetMonth)` | POST /budgets/copy |
| `fetchBudgetCategoryDetail(catId, month)` | GET /budgets/:id/transactions?month= |
| `addPlannedIncome(data)` | POST /budgets/income |
| `removePlannedIncome(id)` | DELETE /budgets/income/:id |

---

## Otras acciones

| Módulo | Acciones principales |
|--------|---------------------|
| Dashboard | `fetchDashboard()` |
| Recurrentes | `fetchRecurring()`, `createRecurring()`, `updateRecurring()`, `deleteRecurring()` |
| Tarjetas | `fetchCreditCards()`, `createCreditCard()`, `updateCreditCard()`, `deleteCreditCard()` |
| Cuentas | `fetchAccounts()`, `createAccount()`, `updateAccount()`, `deleteAccount()` |

---

## Patrón optimista vs. sincrónico

La mayoría de acciones siguen el patrón **sincrónico** (esperar la respuesta del servidor antes de actualizar el store). Las páginas muestran spinners mientras cargan:

```javascript
fetchGoals: async () => {
  set({ savingsLoading: true });
  try {
    const { data } = await api.get('/savings');
    set({ savings: data });
  } finally {
    set({ savingsLoading: false });
  }
},
```

---

## Prevención de doble submit

Para modales de formulario con peticiones async, se usa `useRef` como guard sincrónico (no `useState`, que es asíncrono en el batching de React):

```javascript
const submittingRef = useRef(false);

async function handleSubmit() {
  if (submittingRef.current) return;
  submittingRef.current = true;
  try {
    await storeAction(data);
  } finally {
    submittingRef.current = false;
  }
}
```
