import pool from '../config/db.js';

// GET /budgets?month=YYYY-MM
export async function list(req, res) {
  const uid        = req.userId;
  const month      = req.query.month || new Date().toISOString().slice(0, 7);
  const monthStart = `${month}-01`;

  try {
    // Expense categories visible to user
    const [categories] = await pool.query(
      `SELECT c.id, c.name, c.icon, c.color
       FROM categories c
       LEFT JOIN user_hidden_categories h ON h.category_id = c.id AND h.user_id = ?
       WHERE (c.user_id = ? OR c.user_id IS NULL)
         AND c.type = 'expense'
         AND h.category_id IS NULL
       ORDER BY c.name`,
      [uid, uid]
    );

    // All budget lines for this month (multiple per category)
    const [budgetRows] = await pool.query(
      'SELECT id, category_id, name, amount FROM budgets WHERE user_id = ? AND month = ? ORDER BY id',
      [uid, month]
    );

    // Group budget lines by category_id
    const budgetByCategory = {};
    for (const row of budgetRows) {
      const cid = row.category_id;
      if (!budgetByCategory[cid]) budgetByCategory[cid] = { total: 0, lines: [] };
      budgetByCategory[cid].total += Number(row.amount);
      budgetByCategory[cid].lines.push({ id: row.id, name: row.name, amount: Number(row.amount) });
    }

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
      .filter(c => budgetByCategory[c.id] || spentMap[c.id])
      .map(c => ({
        category_id:   c.id,
        category_name: c.name,
        icon:          c.icon,
        color:         c.color,
        budget:        budgetByCategory[c.id]?.total || 0,
        spent:         spentMap[c.id] || 0,
        lines:         budgetByCategory[c.id]?.lines || [],
      }));

    // ── Recurring monthly expenses active this month ───────────────
    const [recurring] = await pool.query(
      `SELECT r.id, r.description, r.amount, r.frequency, r.category_id, r.type,
              c.name AS category_name, c.color, c.icon
       FROM recurring_transactions r
       JOIN categories c ON c.id = r.category_id
       WHERE r.user_id = ? AND r.is_active = 1
         AND r.start_date <= LAST_DAY(?)
         AND (r.end_date IS NULL OR r.end_date >= ?)
       ORDER BY r.type, r.amount DESC`,
      [uid, monthStart, monthStart]
    );

    // ── Active debt obligations ────────────────────────────────────
    const [debts] = await pool.query(
      `SELECT id, name, monthly_payment, payment_day, current_balance
       FROM debts WHERE user_id = ? AND is_active = 1
       ORDER BY monthly_payment DESC`,
      [uid]
    );

    // ── Savings goals (non-completed) with monthly target ──────────
    const [goals] = await pool.query(
      `SELECT id, name, target_amount, current_amount, deadline, icon, color
       FROM savings_goals WHERE user_id = ? AND is_completed = 0
       ORDER BY deadline ASC`,
      [uid]
    );

    const now = new Date();
    const goalsWithMonthly = goals.map(g => {
      let monthly = null;
      if (g.deadline) {
        const deadline  = new Date(g.deadline);
        const months    = Math.max(1,
          (deadline.getFullYear() - now.getFullYear()) * 12 +
          (deadline.getMonth()    - now.getMonth())
        );
        const remaining = Math.max(0, Number(g.target_amount) - Number(g.current_amount));
        monthly = +(remaining / months).toFixed(2);
      }
      return { ...g, monthly_needed: monthly };
    });

    // ── Planned one-time income for the month ──────────────────────
    const [plannedIncome] = await pool.query(
      'SELECT id, description, amount FROM budget_planned_income WHERE user_id = ? AND month = ? ORDER BY created_at',
      [uid, month]
    );

    res.json({ month, items, categories, recurring, debts, goals: goalsWithMonthly, planned_income: plannedIncome });
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
      `SELECT t.id, t.description, t.amount, t.txn_date,
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

// GET /budgets/:categoryId/history?months=4&end_month=YYYY-MM
export async function categoryHistory(req, res) {
  const uid        = req.userId;
  const categoryId = req.params.categoryId;
  const nMonths    = Math.min(12, Math.max(1, parseInt(req.query.months) || 4));
  const endMonth   = req.query.end_month || new Date().toISOString().slice(0, 7);

  try {
    // Build list of months to query
    const [ey, em] = endMonth.split('-').map(Number);
    const months   = [];
    for (let i = nMonths - 1; i >= 0; i--) {
      let month = em - i;
      let year  = ey;
      while (month <= 0) { month += 12; year--; }
      months.push(`${year}-${String(month).padStart(2, '0')}`);
    }

    // Spending per month
    const [spending] = await pool.query(
      `SELECT DATE_FORMAT(txn_date, '%Y-%m') AS month, SUM(amount) AS spent
       FROM transactions
       WHERE user_id = ? AND category_id = ? AND type = 'expense'
         AND (credit_card_id IS NULL OR is_card_payment = 1)
         AND DATE_FORMAT(txn_date, '%Y-%m') IN (${months.map(() => '?').join(',')})
       GROUP BY DATE_FORMAT(txn_date, '%Y-%m')`,
      [uid, categoryId, ...months]
    );
    const spentMap = {};
    spending.forEach(s => { spentMap[s.month] = Number(s.spent); });

    // Budget totals per month (sum of all lines)
    const [budgets] = await pool.query(
      `SELECT month, SUM(amount) AS budget
       FROM budgets
       WHERE user_id = ? AND category_id = ?
         AND month IN (${months.map(() => '?').join(',')})
       GROUP BY month`,
      [uid, categoryId, ...months]
    );
    const budgetMap = {};
    budgets.forEach(b => { budgetMap[b.month] = Number(b.budget); });

    const result = months.map(m => {
      const [y, mo] = m.split('-').map(Number);
      const label   = new Date(y, mo - 1, 1).toLocaleDateString('es', { month: 'short', year: '2-digit' });
      return { month: m, label, spent: spentMap[m] || 0, budget: budgetMap[m] || 0 };
    });

    res.json(result);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error interno' });
  }
}

// GET /budgets/suggestions?month=YYYY-MM
export async function getSuggestions(req, res) {
  const uid   = req.userId;
  const month = req.query.month || new Date().toISOString().slice(0, 7);

  try {
    const [rows] = await pool.query(
      `SELECT category_id, ROUND(AVG(monthly_spent), 2) AS avg_spent
       FROM (
         SELECT category_id,
                DATE_FORMAT(txn_date, '%Y-%m') AS m,
                SUM(amount) AS monthly_spent
         FROM transactions
         WHERE user_id = ?
           AND type = 'expense'
           AND (credit_card_id IS NULL OR is_card_payment = 1)
           AND txn_date >= DATE_FORMAT(DATE_SUB(CONCAT(?, '-01'), INTERVAL 3 MONTH), '%Y-%m-01')
           AND txn_date < CONCAT(?, '-01')
         GROUP BY category_id, DATE_FORMAT(txn_date, '%Y-%m')
       ) sub
       GROUP BY category_id`,
      [uid, month, month]
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error interno' });
  }
}

// PUT /budgets  { id?, category_id, name?, amount, month }
export async function upsert(req, res) {
  const uid                         = req.userId;
  const { id, category_id, name = '', amount, month } = req.body;

  if (!category_id || !amount || !month) {
    return res.status(400).json({ error: 'category_id, amount y month son requeridos' });
  }

  try {
    if (id) {
      // Update existing line by id
      await pool.query(
        'UPDATE budgets SET amount = ?, name = ?, updated_at = NOW() WHERE id = ? AND user_id = ?',
        [amount, name, id, uid]
      );
    } else {
      // Insert new line (upsert on duplicate name per category/month)
      await pool.query(
        `INSERT INTO budgets (user_id, category_id, name, amount, month)
         VALUES (?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE amount = VALUES(amount), updated_at = NOW()`,
        [uid, category_id, name, amount, month]
      );
    }
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error interno' });
  }
}

// DELETE /budgets/:id  (deletes a single budget line by primary key)
export async function remove(req, res) {
  const uid = req.userId;
  const id  = req.params.id;
  try {
    const [result] = await pool.query('DELETE FROM budgets WHERE id = ? AND user_id = ?', [id, uid]);
    res.json({ success: true, affectedRows: result.affectedRows });
  } catch (err) {
    console.error('[budgets.remove] error:', err);
    res.status(500).json({ error: 'Error interno' });
  }
}

// POST /budgets/income
export async function addPlannedIncome(req, res) {
  const uid = req.userId;
  const { month, description, amount } = req.body;
  if (!month || !amount) return res.status(400).json({ error: 'month y amount son requeridos' });
  try {
    const [result] = await pool.query(
      'INSERT INTO budget_planned_income (user_id, month, description, amount) VALUES (?,?,?,?)',
      [uid, month, description || 'Ingreso', amount]
    );
    res.status(201).json({ id: result.insertId, description: description || 'Ingreso', amount: +amount });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error interno' });
  }
}

// DELETE /budgets/income/:id
export async function removePlannedIncome(req, res) {
  const uid = req.userId;
  const { id } = req.params;
  try {
    await pool.query('DELETE FROM budget_planned_income WHERE id = ? AND user_id = ?', [id, uid]);
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
      `INSERT INTO budgets (user_id, category_id, name, amount, month)
       SELECT user_id, category_id, name, amount, ?
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
