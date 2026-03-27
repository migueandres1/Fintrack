import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import api          from '../services/api.js';

export const useStore = create(
  persist(
    (set, get) => ({
      // ── Auth ──────────────────────────────────────────
      user:  null,
      token: null,
      darkMode: false,

      setToken: (token) => set({ token }),
      setUser:  (user)  => set({ user }),
      toggleDark: () => {
        const dark = !get().darkMode;
        set({ darkMode: dark });
        document.documentElement.classList.toggle('dark', dark);
      },

      login: async (email, password) => {
        const { data } = await api.post('/auth/login', { email, password });
        set({ token: data.token, user: data.user, darkMode: data.user.dark_mode === 1 });
        api.defaults.headers.common['Authorization'] = `Bearer ${data.token}`;
        document.documentElement.classList.toggle('dark', data.user.dark_mode === 1);
        return data;
      },

      register: async (name, email, password, currency) => {
        const { data } = await api.post('/auth/register', { name, email, password, currency });
        set({ token: data.token, user: data.user });
        api.defaults.headers.common['Authorization'] = `Bearer ${data.token}`;
        return data;
      },

      logout: () => {
        set({ user: null, token: null });
        delete api.defaults.headers.common['Authorization'];
      },

      completeOnboarding: async () => {
        await api.put('/auth/onboarding/complete');
        set((s) => ({ user: { ...s.user, onboarding_completed: 1 } }));
      },

      initAuth: () => {
        const { token, darkMode } = get();
        if (token) api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
        document.documentElement.classList.toggle('dark', darkMode);
      },

      // ── Billing ───────────────────────────────────────
      billingStatus: null,

      fetchBillingStatus: async () => {
        try {
          const { data } = await api.get('/billing/status');
          set({ billingStatus: data });
          // Sincroniza el plan en el objeto user también
          set((s) => ({ user: s.user ? { ...s.user, plan: data.plan } : s.user }));
          return data;
        } catch { /* silencioso si no hay auth */ }
      },

      startCheckout: async (priceKey) => {
        const { data } = await api.post('/billing/checkout', { price_key: priceKey });
        return data.url;
      },

      createPortal: async () => {
        const { data } = await api.post('/billing/portal');
        return data.url;
      },

      // ── Dashboard ─────────────────────────────────────
      dashboard: null,
      dashLoading: false,
      fetchDashboard: async () => {
        set({ dashLoading: true });
        try {
          const { data } = await api.get('/dashboard');
          set({ dashboard: data });
        } finally {
          set({ dashLoading: false });
        }
      },

      // ── Transactions ──────────────────────────────────
      transactions:     [],
      txnTotal:         0,
      txnLoading:       false,
      categories:       [],

      fetchTransactions: async (params = {}) => {
        set({ txnLoading: true });
        try {
          const { data } = await api.get('/transactions', { params });
          set({ transactions: data.data, txnTotal: data.total });
        } finally {
          set({ txnLoading: false });
        }
      },

      fetchCategories: async () => {
        const { data } = await api.get('/categories');
        set({ categories: data });
      },

      // ── Categories management ──────────────────────────
      allCategories: [],
      catsLoading: false,

      fetchAllCategories: async () => {
        set({ catsLoading: true });
        try {
          const { data } = await api.get('/categories/manage');
          set({ allCategories: data });
        } finally {
          set({ catsLoading: false });
        }
      },

      createCategory: async (payload) => {
        const { data } = await api.post('/categories', payload);
        set((s) => ({ allCategories: [...s.allCategories, data] }));
        return data;
      },

      updateCategory: async (id, payload) => {
        await api.put(`/categories/${id}`, payload);
        set((s) => ({
          allCategories: s.allCategories.map(c => c.id === id ? { ...c, ...payload } : c),
        }));
      },

      deleteCategory: async (id) => {
        await api.delete(`/categories/${id}`);
        set((s) => ({ allCategories: s.allCategories.filter(c => c.id !== id) }));
      },

      hideCategory: async (id) => {
        await api.post(`/categories/${id}/hide`);
        set((s) => ({
          allCategories: s.allCategories.map(c => c.id === id ? { ...c, is_hidden: 1 } : c),
        }));
      },

      unhideCategory: async (id) => {
        await api.delete(`/categories/${id}/hide`);
        set((s) => ({
          allCategories: s.allCategories.map(c => c.id === id ? { ...c, is_hidden: 0 } : c),
        }));
      },

      createTransaction: async (payload) => {
        const { data } = await api.post('/transactions', payload);
        return data;
      },

      importStatement: async (file) => {
        const form = new FormData();
        form.append('file', file);
        const { data } = await api.post('/transactions/import-statement', form, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        return data; // { transactions: [...], total }
      },

      confirmStatementImport: async (transactions) => {
        const form = new FormData();
        form.append('confirm', 'true');
        form.append('transactions', JSON.stringify(transactions));
        const { data } = await api.post('/transactions/import-statement', form, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        return data; // { imported }
      },

      updateTransaction: async (id, payload) => {
        const { data } = await api.put(`/transactions/${id}`, payload);
        return data;
      },

      deleteTransaction: async (id) => {
        await api.delete(`/transactions/${id}`);
      },

      // ── Debts ─────────────────────────────────────────
      debts:       [],
      debtsLoading:false,

      fetchDebts: async () => {
        set({ debtsLoading: true });
        try {
          const { data } = await api.get('/debts');
          set({ debts: data });
        } finally {
          set({ debtsLoading: false });
        }
      },

      createDebt: async (payload) => {
        const { data } = await api.post('/debts', payload);
        return data;
      },

      updateDebt: async (id, payload) => {
        await api.put(`/debts/${id}`, payload);
      },

      deleteDebt: async (id) => {
        await api.delete(`/debts/${id}`);
      },

      addDebtPayment: async (id, payload) => {
        const { data } = await api.post(`/debts/${id}/payments`, payload);
        return data;
      },

      addDebtPlanned: async (id, payload) => {
        const { data } = await api.post(`/debts/${id}/planned`, payload);
        return data;
      },

      removeDebtPlanned: async (id, plannedId) => {
        await api.delete(`/debts/${id}/planned/${plannedId}`);
      },

      // ── Savings ───────────────────────────────────────
      goals:        [],
      goalsLoading: false,

      fetchGoals: async () => {
        set({ goalsLoading: true });
        try {
          const { data } = await api.get('/savings');
          set({ goals: data });
        } finally {
          set({ goalsLoading: false });
        }
      },

      createGoal: async (payload) => {
        const { data } = await api.post('/savings', payload);
        return data;
      },

      updateGoal: async (id, payload) => {
        await api.put(`/savings/${id}`, payload);
      },

      deleteGoal: async (id) => {
        await api.delete(`/savings/${id}`);
      },

      addContribution: async (id, payload) => {
        const { data } = await api.post(`/savings/${id}/contributions`, payload);
        return data;
      },

      // ── Credit Cards ──────────────────────────────────
      creditCards:        [],
      creditCardsLoading: false,

      fetchCreditCards: async () => {
        set({ creditCardsLoading: true });
        try {
          const { data } = await api.get('/credit-cards');
          set({ creditCards: data });
        } finally {
          set({ creditCardsLoading: false });
        }
      },

      createCreditCard: async (payload) => {
        const { data } = await api.post('/credit-cards', payload);
        return data;
      },

      updateCreditCard: async (id, payload) => {
        await api.put(`/credit-cards/${id}`, payload);
      },

      deleteCreditCard: async (id) => {
        await api.delete(`/credit-cards/${id}`);
      },

      addCardPayment: async (id, payload) => {
        const { data } = await api.post(`/credit-cards/${id}/payments`, payload);
        return data;
      },

      // ── Recurring ─────────────────────────────────────
      recurring:        [],
      recurringLoading: false,

      fetchRecurring: async () => {
        set({ recurringLoading: true });
        try {
          const { data } = await api.get('/recurring');
          set({ recurring: data });
        } finally {
          set({ recurringLoading: false });
        }
      },

      createRecurring: async (payload) => {
        const { data } = await api.post('/recurring', payload);
        return data;
      },

      updateRecurring: async (id, payload) => {
        const { data } = await api.put(`/recurring/${id}`, payload);
        return data;
      },

      deleteRecurring: async (id) => {
        await api.delete(`/recurring/${id}`);
      },

      // ── Bank Accounts ─────────────────────────────────
      accounts:        [],
      accountsLoading: false,

      fetchAccounts: async () => {
        set({ accountsLoading: true });
        try {
          const { data } = await api.get('/accounts');
          set({ accounts: data });
        } finally {
          set({ accountsLoading: false });
        }
      },

      createAccount: async (payload) => {
        const { data } = await api.post('/accounts', payload);
        return data;
      },

      updateAccount: async (id, payload) => {
        await api.put(`/accounts/${id}`, payload);
      },

      deleteAccount: async (id) => {
        await api.delete(`/accounts/${id}`);
      },

      // ── Budgets ───────────────────────────────────────
      budgets:        { month: '', items: [], categories: [], recurring: [], debts: [], goals: [] },
      budgetsLoading: false,

      fetchBudgets: async (month) => {
        set({ budgetsLoading: true });
        try {
          const { data } = await api.get('/budgets', { params: { month } });
          set({ budgets: data });
        } finally {
          set({ budgetsLoading: false });
        }
      },

      // payload: { id?, category_id, name?, amount, month }
      saveBudget: async (payload) => {
        await api.put('/budgets', payload);
      },

      // Delete a single budget line by its id
      deleteBudgetLine: async (id) => {
        await api.delete(`/budgets/${id}`);
      },

      copyBudgetsFromLastMonth: async (targetMonth) => {
        await api.post('/budgets/copy', { targetMonth });
      },

      fetchBudgetCategoryDetail: async (categoryId, month) => {
        const { data } = await api.get(`/budgets/${categoryId}/transactions`, { params: { month } });
        return data;
      },

      fetchBudgetCategoryHistory: async (categoryId, month, months = 4) => {
        const { data } = await api.get(`/budgets/${categoryId}/history`, { params: { end_month: month, months } });
        return data;
      },

      fetchBudgetSuggestions: async (month) => {
        const { data } = await api.get('/budgets/suggestions', { params: { month } });
        return data;
      },

      addPlannedIncome: async (payload) => {
        const { data } = await api.post('/budgets/income', payload);
        return data;
      },

      removePlannedIncome: async (id) => {
        await api.delete(`/budgets/income/${id}`);
      },
    }),
    {
      name:    'fintrack-store',
      partialize: (s) => ({ token: s.token, user: s.user, darkMode: s.darkMode }),
    }
  )
);
