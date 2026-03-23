import pool          from '../config/db.js';
import { calcPayoffProjection } from '../utils/amortization.js';

export async function list(req, res) {
  try {
    const [debts] = await pool.query(
      'SELECT * FROM debts WHERE user_id = ? ORDER BY created_at DESC',
      [req.userId]
    );

    // Cargar pagos planificados pendientes de todas las deudas en una sola query
    let plannedByDebt = {};
    if (debts.length) {
      const ids = debts.map(d => d.id);
      const [planned] = await pool.query(
        `SELECT * FROM debt_planned_payments WHERE debt_id IN (?) AND planned_date >= CURDATE() ORDER BY planned_date`,
        [ids]
      );
      planned.forEach(p => {
        if (!plannedByDebt[p.debt_id]) plannedByDebt[p.debt_id] = [];
        plannedByDebt[p.debt_id].push({ date: new Date(p.planned_date).toISOString().split('T')[0], amount: Number(p.amount) });
      });
    }

    const result = debts.map(d => {
      const plans = plannedByDebt[d.id] || [];
      const projection = calcPayoffProjection(d.current_balance, d.annual_rate, d.monthly_payment, d.payment_day, plans);
      // projectionBase (sin adelantos) solo cuando hay pagos planificados
      const projectionBase = plans.length
        ? calcPayoffProjection(d.current_balance, d.annual_rate, d.monthly_payment, d.payment_day)
        : null;
      return { ...d, projection, projectionBase };
    });
    res.json(result);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error interno' });
  }
}

export async function getOne(req, res) {
  const { id } = req.params;
  try {
    const [[debt]] = await pool.query(
      'SELECT * FROM debts WHERE id = ? AND user_id = ?', [id, req.userId]
    );
    if (!debt) return res.status(404).json({ error: 'No encontrado' });

    const [payments] = await pool.query(
      'SELECT * FROM debt_payments WHERE debt_id = ? ORDER BY payment_date DESC', [id]
    );
    const [planned] = await pool.query(
      'SELECT * FROM debt_planned_payments WHERE debt_id = ? AND planned_date >= CURDATE() ORDER BY planned_date',
      [id]
    );

    const extraPayments = planned.map(p => ({
      date:   new Date(p.planned_date).toISOString().split('T')[0],
      amount: Number(p.amount),
    }));

    // Proyección base (sin pagos adelantados) y con plan para comparar
    const projectionBase = calcPayoffProjection(debt.current_balance, debt.annual_rate, debt.monthly_payment, debt.payment_day);
    const projection     = extraPayments.length
      ? calcPayoffProjection(debt.current_balance, debt.annual_rate, debt.monthly_payment, debt.payment_day, extraPayments)
      : projectionBase;

    res.json({ ...debt, payments, planned, projection, projectionBase });
  } catch (err) {
    res.status(500).json({ error: 'Error interno' });
  }
}

export async function addPlanned(req, res) {
  const { id } = req.params;
  const { planned_date, amount, notes } = req.body;
  try {
    const [[check]] = await pool.query('SELECT id FROM debts WHERE id=? AND user_id=?', [id, req.userId]);
    if (!check) return res.status(404).json({ error: 'No encontrado' });

    const [result] = await pool.query(
      'INSERT INTO debt_planned_payments (debt_id, planned_date, amount, notes) VALUES (?,?,?,?)',
      [id, planned_date, amount, notes || null]
    );
    const [[row]] = await pool.query('SELECT * FROM debt_planned_payments WHERE id=?', [result.insertId]);
    res.status(201).json(row);
  } catch (err) {
    res.status(500).json({ error: 'Error interno' });
  }
}

export async function removePlanned(req, res) {
  const { plannedId } = req.params;
  try {
    const [[check]] = await pool.query(
      'SELECT dp.id FROM debt_planned_payments dp JOIN debts d ON d.id=dp.debt_id WHERE dp.id=? AND d.user_id=?',
      [plannedId, req.userId]
    );
    if (!check) return res.status(404).json({ error: 'No encontrado' });
    await pool.query('DELETE FROM debt_planned_payments WHERE id=?', [plannedId]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Error interno' });
  }
}

export async function create(req, res) {
const { name, initial_balance, annual_rate, monthly_payment, payment_day = 1, start_date, notes } = req.body;  try {
    const [result] = await pool.query(
`INSERT INTO debts
   (user_id, name, initial_balance, current_balance, annual_rate, monthly_payment, payment_day, start_date, notes)
 VALUES (?,?,?,?,?,?,?,?,?)`,
[req.userId, name, initial_balance, initial_balance, annual_rate, monthly_payment, payment_day, start_date, notes]
    );
    const [[debt]] = await pool.query('SELECT * FROM debts WHERE id = ?', [result.insertId]);
    res.status(201).json({ ...debt, projection: calcPayoffProjection(debt.current_balance, debt.annual_rate, debt.monthly_payment, debt.payment_day) });
  } catch (err) {
    res.status(500).json({ error: 'Error interno' });
  }
}

export async function update(req, res) {
  const { id } = req.params;
const { name, annual_rate, monthly_payment, payment_day, notes } = req.body;
  try {
    const [[check]] = await pool.query('SELECT id FROM debts WHERE id=? AND user_id=?', [id, req.userId]);
    if (!check) return res.status(404).json({ error: 'No encontrado' });

    await pool.query(
      'UPDATE debts SET name=?, annual_rate=?, monthly_payment=?, payment_day=?, notes=? WHERE id=?',
      [name, annual_rate, monthly_payment, payment_day, notes, id]
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Error interno' });
  }
}

export async function remove(req, res) {
  const { id } = req.params;
  try {
    const [[check]] = await pool.query('SELECT id FROM debts WHERE id=? AND user_id=?', [id, req.userId]);
    if (!check) return res.status(404).json({ error: 'No encontrado' });
    await pool.query('DELETE FROM debts WHERE id=?', [id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Error interno' });
  }
}

export async function addPayment(req, res) {
  const { id } = req.params;
  const { payment_date, total_amount, extra_principal = 0, notes } = req.body;

  try {
    const [[debt]] = await pool.query('SELECT * FROM debts WHERE id=? AND user_id=?', [id, req.userId]);
    if (!debt) return res.status(404).json({ error: 'No encontrado' });

    const r = debt.annual_rate / 12;
    const interest_paid   = +(debt.current_balance * r).toFixed(2);
    const principal_paid  = +(Math.min(total_amount - interest_paid - extra_principal, debt.current_balance)).toFixed(2);
    const balance_after   = +(Math.max(debt.current_balance - principal_paid - extra_principal, 0)).toFixed(2);

    const [result] = await pool.query(
      `INSERT INTO debt_payments
         (debt_id, payment_date, total_amount, principal_paid, interest_paid, extra_principal, balance_after, notes)
       VALUES (?,?,?,?,?,?,?,?)`,
      [id, payment_date, total_amount, principal_paid, interest_paid, extra_principal, balance_after, notes]
    );

    await pool.query(
      'UPDATE debts SET current_balance=?, is_active=? WHERE id=?',
      [balance_after, balance_after > 0 ? 1 : 0, id]
    );

    const [[payment]] = await pool.query('SELECT * FROM debt_payments WHERE id=?', [result.insertId]);
    res.status(201).json({ payment, new_balance: balance_after });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error interno' });
  }
}

export async function getPayments(req, res) {
  const { id } = req.params;
  try {
    const [[check]] = await pool.query('SELECT id FROM debts WHERE id=? AND user_id=?', [id, req.userId]);
    if (!check) return res.status(404).json({ error: 'No encontrado' });

    const [rows] = await pool.query(
      'SELECT * FROM debt_payments WHERE debt_id=? ORDER BY payment_date DESC', [id]
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: 'Error interno' });
  }
}
