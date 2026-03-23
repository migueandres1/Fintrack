import pool from '../config/db.js';
import { processRecurring } from './recurring.controller.js';

export async function getDashboard(req, res) {
  const uid = req.userId;
  try {
    // Procesar recurrentes pendientes de forma silenciosa
    try { await processRecurring(uid); } catch (_) {}

    // Balance total — crédito en tarjeta NO reduce balance hasta ser pagado
    const [[balance]] = await pool.query(
      `SELECT
         SUM(CASE WHEN type='income'  THEN amount ELSE 0 END) AS total_income,
         SUM(CASE WHEN type='expense' AND (credit_card_id IS NULL OR is_card_payment = 1) THEN amount ELSE 0 END) AS total_expenses
       FROM transactions WHERE user_id = ?`, [uid]
    );

    // Resumen mes actual
    const [[thisMonth]] = await pool.query(
      `SELECT
         SUM(CASE WHEN type='income'  THEN amount ELSE 0 END) AS income,
         SUM(CASE WHEN type='expense' AND (credit_card_id IS NULL OR is_card_payment = 1) THEN amount ELSE 0 END) AS expenses
       FROM transactions
       WHERE user_id = ?
         AND DATE_FORMAT(txn_date,'%Y-%m') = DATE_FORMAT(NOW(),'%Y-%m')`, [uid]
    );

    // Ingresos/gastos últimos 6 meses (sin crédito pendiente)
    const [monthly] = await pool.query(
      `SELECT DATE_FORMAT(txn_date,'%Y-%m') AS month,
              SUM(CASE WHEN type='income'  THEN amount ELSE 0 END) AS income,
              SUM(CASE WHEN type='expense' AND (credit_card_id IS NULL OR is_card_payment = 1) THEN amount ELSE 0 END) AS expenses
       FROM transactions
       WHERE user_id = ? AND txn_date >= DATE_SUB(NOW(), INTERVAL 6 MONTH)
       GROUP BY month ORDER BY month`, [uid]
    );

    // Deudas activas
    const [debts] = await pool.query(
      `SELECT id, name, current_balance, initial_balance, monthly_payment, annual_rate,
              payment_day, start_date
       FROM debts WHERE user_id = ? AND is_active = 1`, [uid]
    );
    const totalDebt = debts.reduce((s, d) => s + d.current_balance, 0);

    // Calcular próxima fecha de pago usando payment_day
    const today = new Date();
    debts.forEach(debt => {
      const payDay = Math.max(1, Math.min(31, Number(debt.payment_day) || 1));
      const clamp  = (y, m) => Math.min(payDay, new Date(y, m + 1, 0).getDate());
      let next = new Date(today.getFullYear(), today.getMonth(), clamp(today.getFullYear(), today.getMonth()));
      if (next <= today) {
        const nm = today.getMonth() + 1;
        const ny = nm > 11 ? today.getFullYear() + 1 : today.getFullYear();
        next = new Date(ny, nm % 12, clamp(ny, nm % 12));
      }
      debt.next_due = next.toISOString().split('T')[0];
    });

    // Metas de ahorro
    const [goals] = await pool.query(
      'SELECT * FROM savings_goals WHERE user_id=? ORDER BY created_at DESC LIMIT 5', [uid]
    );

    // Últimas transacciones
    const [recent] = await pool.query(
      `SELECT t.*, c.name AS category_name, c.icon, c.color
       FROM transactions t JOIN categories c ON c.id=t.category_id
       WHERE t.user_id=? ORDER BY t.txn_date DESC LIMIT 5`, [uid]
    );

    res.json({
      balance: {
        total:          +((balance.total_income || 0) - (balance.total_expenses || 0)).toFixed(2),
        total_income:   +(balance.total_income  || 0).toFixed(2),
        total_expenses: +(balance.total_expenses || 0).toFixed(2),
      },
      this_month: {
        income:   +(thisMonth.income   || 0).toFixed(2),
        expenses: +(thisMonth.expenses || 0).toFixed(2),
      },
      monthly_trend: monthly,
      debts,
      total_debt:     +totalDebt.toFixed(2),
      goals,
      recent_transactions: recent,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error interno' });
  }
}
