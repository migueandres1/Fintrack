import { format, parseISO, formatDistanceToNow, differenceInDays } from 'date-fns';
import { es } from 'date-fns/locale';

export const fmt = {
  currency: (n, currency = 'USD') =>
    new Intl.NumberFormat('es-SV', { style: 'currency', currency, minimumFractionDigits: 2 }).format(n ?? 0),

  pct: (n) => `${(n * 100).toFixed(2)}%`,

  date: (d) => {
    try { return format(typeof d === 'string' ? parseISO(d) : d, 'dd MMM yyyy', { locale: es }); }
    catch { return d; }
  },

  monthYear: (str) => {
    // str like "2026-03"
    try { return format(parseISO(`${str}-01`), 'MMM yyyy', { locale: es }); }
    catch { return str; }
  },

  relative: (d) => {
    try { return formatDistanceToNow(typeof d === 'string' ? parseISO(d) : d, { locale: es, addSuffix: true }); }
    catch { return d; }
  },

  daysUntil: (d) => {
    try { return differenceInDays(typeof d === 'string' ? parseISO(d) : d, new Date()); }
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
