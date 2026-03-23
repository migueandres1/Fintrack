/**
 * Cálculos de amortización francesa con soporte de abonos extra a capital.
 */

/**
 * Calcula la cuota mensual teórica para un préstamo estándar.
 */
export function calcMonthlyPayment(principal, annualRate, months) {
  if (annualRate === 0) return principal / months;
  const r = annualRate / 12;
  return (principal * r * Math.pow(1 + r, months)) / (Math.pow(1 + r, months) - 1);
}

/**
 * Genera la tabla de amortización completa a partir del balance actual.
 * Soporta pagos extra que se aplican directamente al capital.
 *
 * @param {number} balance        Saldo actual de la deuda
 * @param {number} annualRate     Tasa anual en decimal (ej: 0.24)
 * @param {number} monthlyPayment Cuota mensual acordada
 * @param {Date}   startDate      Fecha del siguiente pago
 * @param {Array}  extraPayments  [{date, amount}] abonos extra programados
 * @returns {Array} tabla de amortización
 */
export function buildAmortizationTable(balance, annualRate, monthlyPayment, startDate, extraPayments = []) {
  const r = annualRate / 12;
  const table = [];
  let remaining = balance;
  let date = new Date(startDate);
  let period = 1;
  const MAX_PERIODS = 600; // safety cap

  while (remaining > 0.01 && period <= MAX_PERIODS) {
    const interest  = remaining * r;
    const principal = Math.min(monthlyPayment - interest, remaining);
    // Compare year-month as strings to avoid any timezone shift
    const ym    = date.toISOString().slice(0, 7); // "YYYY-MM"
    const extra = extraPayments
      .filter(ep => ep.date.slice(0, 7) === ym)
      .reduce((sum, ep) => sum + ep.amount, 0);

    remaining = Math.max(remaining - principal - extra, 0);

    table.push({
      period,
      date:          date.toISOString().split('T')[0],
      payment:       +(principal + interest).toFixed(2),
      principal:     +principal.toFixed(2),
      interest:      +interest.toFixed(2),
      extraPrincipal:+extra.toFixed(2),
      balance:       +remaining.toFixed(2),
    });

    // Avanzar al siguiente mes
    date = new Date(date.getFullYear(), date.getMonth() + 1, date.getDate());
    period++;
  }

  return table;
}

/**
 * Calcula intereses totales y fecha de payoff a partir del saldo actual.
 * Usa el día de pago (paymentDay) para determinar desde qué fecha proyectar:
 * - Si hoy ya pasó el día de pago de este mes → la cuota de este mes ya se pagó,
 *   la próxima es el mes siguiente.
 * - Si hoy es antes del día de pago → la cuota de este mes aún no se paga.
 */
export function calcPayoffProjection(balance, annualRate, monthlyPayment, paymentDay = 1, extraPayments = []) {
  const today = new Date();
  const day   = Math.max(1, Math.min(31, Number(paymentDay) || 1));

  let year  = today.getFullYear();
  let month = today.getMonth();

  if (today.getDate() >= day) {
    month += 1;
    if (month > 11) { month = 0; year += 1; }
  }

  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const startDate   = new Date(year, month, Math.min(day, daysInMonth));

  const table         = buildAmortizationTable(balance, annualRate, monthlyPayment, startDate, extraPayments);
  const totalInterest = table.reduce((s, r) => s + r.interest, 0);
  const payoffDate    = table.length ? table[table.length - 1].date : null;
  return {
    months:        table.length,
    payoffDate,
    totalInterest: +totalInterest.toFixed(2),
    schedule:      table,
  };
}
