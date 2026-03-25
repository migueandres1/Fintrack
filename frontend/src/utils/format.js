import { format, parseISO, formatDistanceToNow, differenceInDays } from 'date-fns';
import { es } from 'date-fns/locale';

// Fecha local como YYYY-MM-DD (evita el desfase UTC de toISOString)
export const localDate = (d = new Date()) => {
  const dt = d instanceof Date ? d : new Date(d);
  return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`;
};

export const fmt = {
  currency: (n, currency = 'USD') =>
    new Intl.NumberFormat('es-SV', { style: 'currency', currency, minimumFractionDigits: 2 }).format(n ?? 0),

  pct: (n) => `${(n * 100).toFixed(2)}%`,

  date: (d) => {
    try {
      const s = typeof d === 'string' ? d.split('T')[0] : d;
      return format(typeof s === 'string' ? parseISO(s) : s, 'dd MMM yyyy', { locale: es });
    }
    catch { return d; }
  },

  monthYear: (str) => {
    // str like "2026-03"
    try { return format(parseISO(`${str}-01`), 'MMM yyyy', { locale: es }); }
    catch { return str; }
  },

  relative: (d) => {
    try {
      const s = typeof d === 'string' ? d.split('T')[0] : d;
      return formatDistanceToNow(typeof s === 'string' ? parseISO(s) : s, { locale: es, addSuffix: true });
    }
    catch { return d; }
  },

  daysUntil: (d) => {
    try {
      const s = typeof d === 'string' ? d.split('T')[0] : d;
      return differenceInDays(typeof s === 'string' ? parseISO(s) : s, new Date());
    }
    catch { return null; }
  },

  months: (n) => {
    if (!n) return '—';
    const y = Math.floor(n / 12);
    const m = n % 12;
    if (y === 0) return `${m} mes${m !== 1 ? 'es' : ''}`;
    if (m === 0) return `${y} año${y !== 1 ? 's' : ''}`;
    return `${y}a ${m}m`;
  },
};
