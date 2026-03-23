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

      initAuth: () => {
        const { token, darkMode } = get();
        if (token) api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
        document.documentElement.classList.toggle('dark', darkMode);
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

      createTransaction: async (payload) => {
        const { data } = await api.post('/transactions', payload);
        return data;
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
    }),
    {
      name:    'fintrack-store',
      partialize: (s) => ({ token: s.token, user: s.user, darkMode: s.darkMode }),
    }
  )
);
