import pool from '../config/db.js';

// ── Helpers de integridad ──────────────────────────────────────────────────

/**
 * Recalcula current_balance de una deuda sumando todos sus pagos registrados.
 * Fuente de verdad: debt_payments. No usa incrementos.
 */
async function recomputeDebtBalance(conn, debtId) {
  const [[{ paid }]] = await conn.query(
    `SELECT COALESCE(SUM(principal_paid + extra_principal), 0) AS paid
     FROM debt_payments WHERE debt_id = ?`,
    [debtId]
  );
  const [[debt]] = await conn.query(
    'SELECT initial_balance FROM debts WHERE id = ?', [debtId]
  );
  if (!debt) return;
  const newBalance = +Math.max(0, Number(debt.initial_balance) - Number(paid)).toFixed(2);
  await conn.query(
    'UPDATE debts SET current_balance=?, is_active=? WHERE id=?',
    [newBalance, newBalance > 0 ? 1 : 0, debtId]
  );
}

/**
 * Recalcula current_amount de una meta sumando todos sus aportes registrados.
 * Fuente de verdad: savings_contributions. No usa incrementos.
 */
async function recomputeGoalAmount(conn, goalId) {
  const [[{ total }]] = await conn.query(
    `SELECT COALESCE(SUM(amount), 0) AS total
     FROM savings_contributions WHERE goal_id = ?`,
    [goalId]
  );
  const [[goal]] = await conn.query(
    'SELECT target_amount FROM savings_goals WHERE id = ?', [goalId]
  );
  if (!goal) return;
  const newTotal = +Number(total).toFixed(2);
  await conn.query(
    'UPDATE savings_goals SET current_amount=?, is_completed=? WHERE id=?',
    [newTotal, newTotal >= Number(goal.target_amount) ? 1 : 0, goalId]
  );
}

/**
 * Aplica los efectos secundarios de una transacción:
 * - Si tiene debt_id: crea registro en debt_payments y recalcula saldo de la deuda.
 * - Si tiene savings_goal_id: crea aporte y recalcula monto de la meta.
 */
async function applyEffects(conn, txnId, userId, { debt_id, savings_goal_id, amount, extra_principal, txn_date, description }) {
  if (debt_id) {
    const [[debt]] = await conn.query(
      'SELECT * FROM debts WHERE id = ? AND user_id = ?', [debt_id, userId]
    );
    if (debt) {
      const r             = Number(debt.annual_rate) / 12;
      const interest_paid = +(Number(debt.current_balance) * r).toFixed(2);
      const principal_paid = +Math.min(
        amount - interest_paid - extra_principal,
        Number(debt.current_balance)
      ).toFixed(2);
      const balance_after = +Math.max(
        Number(debt.current_balance) - principal_paid - extra_principal, 0
      ).toFixed(2);

      await conn.query(
        `INSERT INTO debt_payments
           (debt_id, transaction_id, payment_date, total_amount,
            principal_paid, interest_paid, extra_principal, balance_after, notes)
         VALUES (?,?,?,?,?,?,?,?,?)`,
        [debt_id, txnId, txn_date, amount,
         principal_paid, interest_paid, extra_principal, balance_after,
         description || null]
      );
      await recomputeDebtBalance(conn, debt_id);
    }
  }

  if (savings_goal_id) {
    const [[goal]] = await conn.query(
      'SELECT id FROM savings_goals WHERE id = ? AND user_id = ?', [savings_goal_id, userId]
    );
    if (goal) {
      await conn.query(
        `INSERT INTO savings_contributions
           (goal_id, transaction_id, amount, contrib_date, notes)
         VALUES (?,?,?,?,?)`,
        [savings_goal_id, txnId, amount, txn_date, description || null]
      );
      await recomputeGoalAmount(conn, savings_goal_id);
    }
  }
}

/**
 * Revierte los efectos secundarios de una transacción:
 * - Elimina su registro en debt_payments (por transaction_id) y recalcula saldo.
 * - Elimina su aporte en savings_contributions (por transaction_id) y recalcula monto.
 */
async function reverseEffects(conn, txnId, { debt_id, savings_goal_id }) {
  if (debt_id) {
    await conn.query('DELETE FROM debt_payments WHERE transaction_id = ?', [txnId]);
    await recomputeDebtBalance(conn, debt_id);
  }
  if (savings_goal_id) {
    await conn.query('DELETE FROM savings_contributions WHERE transaction_id = ?', [txnId]);
    await recomputeGoalAmount(conn, savings_goal_id);
  }
}

// ── Handlers ───────────────────────────────────────────────────────────────

export async function list(req, res) {
  const { type, category_id, from, to, page = 1, limit = 50 } = req.query;
  const offset = (page - 1) * limit;
  const params = [req.userId];
  let where = 'WHERE t.user_id = ?';

  if (type)        { where += ' AND t.type = ?';        params.push(type); }
  if (category_id) { where += ' AND t.category_id = ?'; params.push(category_id); }
  if (from)        { where += ' AND t.txn_date >= ?';   params.push(from); }
  if (to)          { where += ' AND t.txn_date <= ?';   params.push(to); }

  try {
    const [[{ total }]] = await pool.query(
      `SELECT COUNT(*) AS total FROM transactions t ${where}`, params
    );
    const [rows] = await pool.query(
      `SELECT t.*, c.name AS category_name, c.icon, c.color
       FROM transactions t
       JOIN categories c ON c.id = t.category_id
       ${where}
       ORDER BY t.txn_date DESC, t.id DESC
       LIMIT ? OFFSET ?`,
      [...params, Number(limit), Number(offset)]
    );
    res.json({ data: rows, total, page: Number(page), limit: Number(limit) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error interno' });
  }
}

export async function create(req, res) {
  const { category_id, type, amount, description, txn_date,
          debt_id, savings_goal_id, credit_card_id, extra_principal = 0 } = req.body;

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const [result] = await conn.query(
      `INSERT INTO transactions
         (user_id, category_id, type, amount, description, txn_date,
          debt_id, savings_goal_id, credit_card_id, extra_principal)
       VALUES (?,?,?,?,?,?,?,?,?,?)`,
      [req.userId, category_id, type, amount, description, txn_date,
       debt_id || null, savings_goal_id || null, credit_card_id || null,
       Number(extra_principal) || 0]
    );
    const txnId = result.insertId;

    await applyEffects(conn, txnId, req.userId, {
      debt_id:         debt_id         || null,
      savings_goal_id: savings_goal_id || null,
      amount:          Number(amount),
      extra_principal: Number(extra_principal) || 0,
      txn_date,
      description,
    });

    await conn.commit();

    const [rows] = await conn.query(
      `SELECT t.*, c.name AS category_name, c.icon, c.color
       FROM transactions t JOIN categories c ON c.id = t.category_id
       WHERE t.id = ?`, [txnId]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    await conn.rollback();
    console.error(err);
    res.status(500).json({ error: 'Error interno' });
  } finally {
    conn.release();
  }
}

export async function update(req, res) {
  const { id } = req.params;
  const { category_id, type, amount, description, txn_date,
          debt_id, savings_goal_id, credit_card_id, extra_principal } = req.body;

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    // Leer estado anterior completo
    const [[old]] = await conn.query(
      'SELECT * FROM transactions WHERE id = ? AND user_id = ?', [id, req.userId]
    );
    if (!old) {
      await conn.rollback();
      return res.status(404).json({ error: 'No encontrado' });
    }

    // 1. Revertir efectos del estado anterior
    await reverseEffects(conn, Number(id), {
      debt_id:         old.debt_id,
      savings_goal_id: old.savings_goal_id,
    });

    // 2. Actualizar la transacción
    await conn.query(
      `UPDATE transactions
       SET category_id=?, type=?, amount=?, description=?, txn_date=?,
           debt_id=?, savings_goal_id=?, credit_card_id=?, extra_principal=?
       WHERE id=?`,
      [category_id, type, amount, description, txn_date,
       debt_id || null, savings_goal_id || null, credit_card_id || null,
       Number(extra_principal) || 0, id]
    );

    // 3. Aplicar efectos del nuevo estado
    await applyEffects(conn, Number(id), req.userId, {
      debt_id:         debt_id         || null,
      savings_goal_id: savings_goal_id || null,
      amount:          Number(amount),
      extra_principal: Number(extra_principal) || 0,
      txn_date,
      description,
    });

    await conn.commit();

    const [rows] = await conn.query(
      `SELECT t.*, c.name AS category_name, c.icon, c.color
       FROM transactions t JOIN categories c ON c.id = t.category_id
       WHERE t.id = ?`, [id]
    );
    res.json(rows[0]);
  } catch (err) {
    await conn.rollback();
    console.error(err);
    res.status(500).json({ error: 'Error interno' });
  } finally {
    conn.release();
  }
}

export async function remove(req, res) {
  const { id } = req.params;
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const [[txn]] = await conn.query(
      'SELECT * FROM transactions WHERE id = ? AND user_id = ?', [id, req.userId]
    );
    if (!txn) {
      await conn.rollback();
      return res.status(404).json({ error: 'No encontrado' });
    }

    // Revertir efectos antes de eliminar
    await reverseEffects(conn, Number(id), {
      debt_id:         txn.debt_id,
      savings_goal_id: txn.savings_goal_id,
    });

    await conn.query('DELETE FROM transactions WHERE id = ?', [id]);

    await conn.commit();
    res.json({ success: true });
  } catch (err) {
    await conn.rollback();
    console.error(err);
    res.status(500).json({ error: 'Error interno' });
  } finally {
    conn.release();
  }
}

export async function summary(req, res) {
  const { year = new Date().getFullYear() } = req.query;
  try {
    const [monthly] = await pool.query(
      `SELECT DATE_FORMAT(txn_date,'%Y-%m') AS month,
              type,
              SUM(amount) AS total
       FROM transactions
       WHERE user_id = ? AND YEAR(txn_date) = ?
       GROUP BY month, type
       ORDER BY month`,
      [req.userId, year]
    );
    const [byCategory] = await pool.query(
      `SELECT c.name, c.color, c.icon, t.type, SUM(t.amount) AS total
       FROM transactions t JOIN categories c ON c.id = t.category_id
       WHERE t.user_id = ? AND YEAR(t.txn_date) = ?
       GROUP BY c.id, t.type`,
      [req.userId, year]
    );
    res.json({ monthly, byCategory });
  } catch (err) {
    res.status(500).json({ error: 'Error interno' });
  }
}

export async function exportCsv(req, res) {
  const { from, to } = req.query;
  const params = [req.userId];
  let where = 'WHERE t.user_id = ?';
  if (from) { where += ' AND t.txn_date >= ?'; params.push(from); }
  if (to)   { where += ' AND t.txn_date <= ?'; params.push(to); }

  try {
    const [rows] = await pool.query(
      `SELECT t.txn_date, t.type, c.name AS category, t.amount, t.description
       FROM transactions t JOIN categories c ON c.id = t.category_id
       ${where} ORDER BY t.txn_date DESC`,
      params
    );
    const header = 'Fecha,Tipo,Categoría,Monto,Descripción\n';
    const csv = rows.map(r =>
      `${r.txn_date},${r.type},${r.category},${r.amount},"${r.description || ''}"`
    ).join('\n');
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="transacciones.csv"');
    res.send(header + csv);
  } catch (err) {
    res.status(500).json({ error: 'Error interno' });
  }
}

export async function getCategories(req, res) {
  try {
    const [rows] = await pool.query(
      'SELECT * FROM categories WHERE user_id IS NULL OR user_id = ? ORDER BY type, name',
      [req.userId]
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: 'Error interno' });
  }
}
