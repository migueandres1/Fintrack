import pool from '../config/db.js';

// GET /budgets?month=YYYY-MM
export async function list(req, res) {
  const uid   = req.userId;
  const month = req.query.month || new Date().toISOString().slice(0, 7);
  const monthStart = `${month}-01`;

  try {
    // Expense categories visible to user
    const [categories] = await pool.query(
      `SELECT c.id, c.name, c.icon, c.color, c.type
       FROM categories c
       LEFT JOIN user_hidden_categories h ON h.category_id = c.id AND h.user_id = ?
       WHERE (c.user_id = ? OR c.user_id IS NULL)
         AND c.type = 'expense'
         AND h.category_id IS NULL
       ORDER BY c.name`,
      [uid, uid]
    );

    // Budgets for this month
    const [budgets] = await pool.query(
      'SELECT category_id, amount FROM budgets WHERE user_id = ? AND month = ?',
      [uid, month]
    );
    const budgetMap = {};
    budgets.forEach(b => { budgetMap[b.category_id] = Number(b.amount); });

    // Actual spending per category this month
    const [spending] = await pool.query(
      `SELECT category_id, SUM(amount) AS spent
       FROM transactions
       WHERE user_id = ? AND type = 'expense'
         AND (credit_card_id IS NULL OR is_card_payment = 1)
         AND DATE_FORMAT(txn_date, '%Y-%m') = ?
       GROUP BY category_id`,
      [uid, month]
    );
    const spentMap = {};
    spending.forEach(s => { spentMap[s.category_id] = Number(s.spent) || 0; });

    const items = categories
      .filter(c => budgetMap[c.id] || spentMap[c.id])
      .map(c => ({
        category_id:   c.id,
        category_name: c.name,
        icon:          c.icon,
        color:         c.color,
        budget:        budgetMap[c.id] || 0,
        spent:         spentMap[c.id]  || 0,
      }));

    // ── Recurring monthly expenses active this month ──────────────
    const [recurring] = await pool.query(
      `SELECT r.id, r.description, r.amount, r.frequency, r.category_id,
              c.name AS category_name, c.color, c.icon
       FROM recurring_transactions r
       JOIN categories c ON c.id = r.category_id
       WHERE r.user_id = ? AND r.is_active = 1 AND r.type = 'expense'
         AND r.start_date <= LAST_DAY(?)
         AND (r.end_date IS NULL OR r.end_date >= ?)
       ORDER BY r.amount DESC`,
      [uid, monthStart, monthStart]
    );

    // ── Active debt obligations ───────────────────────────────────
    const [debts] = await pool.query(
      `SELECT id, name, monthly_payment, payment_day, current_balance
       FROM debts WHERE user_id = ? AND is_active = 1
       ORDER BY monthly_payment DESC`,
      [uid]
    );

    // ── Savings goals (non-completed) with monthly target ─────────
    const [goals] = await pool.query(
      `SELECT id, name, target_amount, current_amount, deadline, icon, color
       FROM savings_goals WHERE user_id = ? AND is_completed = 0
       ORDER BY deadline ASC`,
      [uid]
    );

    // Calculate monthly contribution needed per goal
    const now = new Date();
    const goalsWithMonthly = goals.map(g => {
      let monthly = null;
      if (g.deadline) {
        const deadline = new Date(g.deadline);
        const months   = Math.max(1,
          (deadline.getFullYear() - now.getFullYear()) * 12 +
          (deadline.getMonth()    - now.getMonth())
        );
        const remaining = Math.max(0, Number(g.target_amount) - Number(g.current_amount));
        monthly = +(remaining / months).toFixed(2);
      }
      return { ...g, monthly_needed: monthly };
    });

    res.json({ month, items, categories, recurring, debts, goals: goalsWithMonthly });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error interno' });
  }
}

// GET /budgets/:categoryId/transactions?month=YYYY-MM
export async function categoryDetail(req, res) {
  const uid        = req.userId;
  const categoryId = req.params.categoryId;
  const month      = req.query.month || new Date().toISOString().slice(0, 7);

  try {
    const [transactions] = await pool.query(
      `SELECT t.id, t.description, t.amount, t.txn_date, t.notes,
              t.credit_card_id, cc.name AS card_name, cc.last_four
       FROM transactions t
       LEFT JOIN credit_cards cc ON cc.id = t.credit_card_id
       WHERE t.user_id = ? AND t.category_id = ? AND t.type = 'expense'
         AND (t.credit_card_id IS NULL OR t.is_card_payment = 1)
         AND DATE_FORMAT(t.txn_date, '%Y-%m') = ?
       ORDER BY t.txn_date DESC`,
      [uid, categoryId, month]
    );
    res.json(transactions);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error interno' });
  }
}

// PUT /budgets
export async function upsert(req, res) {
  const uid = req.userId;
  const { category_id, amount, month } = req.body;
  if (!category_id || !amount || !month) {
    return res.status(400).json({ error: 'category_id, amount y month son requeridos' });
  }
  try {
    await pool.query(
      `INSERT INTO budgets (user_id, category_id, amount, month)
       VALUES (?,?,?,?)
       ON DUPLICATE KEY UPDATE amount = VALUES(amount), updated_at = NOW()`,
      [uid, category_id, amount, month]
    );
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error interno' });
  }
}

// DELETE /budgets/:categoryId?month=YYYY-MM
export async function remove(req, res) {
  const uid        = req.userId;
  const categoryId = req.params.categoryId;
  const month      = req.query.month;
  try {
    await pool.query(
      'DELETE FROM budgets WHERE user_id = ? AND category_id = ? AND month = ?',
      [uid, categoryId, month]
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Error interno' });
  }
}

// POST /budgets/copy
export async function copyFromLastMonth(req, res) {
  const uid             = req.userId;
  const { targetMonth } = req.body;
  if (!targetMonth) return res.status(400).json({ error: 'targetMonth requerido' });

  try {
    const [y, m] = targetMonth.split('-').map(Number);
    const lm     = m === 1 ? 12 : m - 1;
    const ly     = m === 1 ? y - 1 : y;
    const lastMonth = `${ly}-${String(lm).padStart(2, '0')}`;

    await pool.query(
      `INSERT INTO budgets (user_id, category_id, amount, month)
       SELECT user_id, category_id, amount, ?
       FROM budgets WHERE user_id = ? AND month = ?
       ON DUPLICATE KEY UPDATE amount = VALUES(amount), updated_at = NOW()`,
      [targetMonth, uid, lastMonth]
    );
    res.json({ success: true, copiedFrom: lastMonth });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error interno' });
  }
}
