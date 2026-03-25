import pool from '../config/db.js';

// GET /budgets?month=YYYY-MM
// Returns all budgets for the month with actual spending
export async function list(req, res) {
  const uid   = req.userId;
  const month = req.query.month || new Date().toISOString().slice(0, 7);

  try {
    // All categories (user + global expense categories)
    const [categories] = await pool.query(
      `SELECT id, name, icon, color, type
       FROM categories
       WHERE (user_id = ? OR user_id IS NULL) AND type = 'expense'
       ORDER BY name`,
      [uid]
    );

    // Budgets for this month
    const [budgets] = await pool.query(
      'SELECT category_id, amount FROM budgets WHERE user_id = ? AND month = ?',
      [uid, month]
    );
    const budgetMap = {};
    budgets.forEach(b => { budgetMap[b.category_id] = Number(b.amount); });

    // Actual spending per category this month (excluding card-balance-pending charges)
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

    // Return only categories that have a budget set, plus spent > 0
    const result = categories
      .filter(c => budgetMap[c.id] || spentMap[c.id])
      .map(c => ({
        category_id: c.id,
        category_name: c.name,
        icon: c.icon,
        color: c.color,
        budget: budgetMap[c.id] || 0,
        spent: spentMap[c.id] || 0,
      }));

    res.json({ month, items: result, categories });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error interno' });
  }
}

// PUT /budgets  – upsert a single category budget
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

// POST /budgets/copy – copy last month's budgets into target month
export async function copyFromLastMonth(req, res) {
  const uid         = req.userId;
  const { targetMonth } = req.body; // YYYY-MM
  if (!targetMonth) return res.status(400).json({ error: 'targetMonth requerido' });

  try {
    // Derive last month
    const [y, m] = targetMonth.split('-').map(Number);
    const lm     = m === 1 ? 12 : m - 1;
    const ly     = m === 1 ? y - 1 : y;
    const lastMonth = `${ly}-${String(lm).padStart(2, '0')}`;

    await pool.query(
      `INSERT INTO budgets (user_id, category_id, amount, month)
       SELECT user_id, category_id, amount, ?
       FROM budgets
       WHERE user_id = ? AND month = ?
       ON DUPLICATE KEY UPDATE amount = VALUES(amount), updated_at = NOW()`,
      [targetMonth, uid, lastMonth]
    );
    res.json({ success: true, copiedFrom: lastMonth });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error interno' });
  }
}
