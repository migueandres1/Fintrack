import pool from '../config/db.js';

const TYPE_LABEL = {
  checking:   'Cuenta corriente',
  savings:    'Cuenta de ahorro',
  cash:       'Efectivo',
  investment: 'Inversión',
};

export async function list(req, res) {
  const uid = req.userId;
  try {
    const [accounts] = await pool.query(
      'SELECT * FROM bank_accounts WHERE user_id = ? ORDER BY created_at ASC',
      [uid]
    );

    if (!accounts.length) return res.json([]);

    // Balance = initial_balance + ingresos - gastos de transacciones vinculadas
    const ids = accounts.map(a => a.id);
    const [txnTotals] = await pool.query(
      `SELECT account_id,
              SUM(CASE WHEN type = 'income'  THEN amount ELSE 0 END) AS total_income,
              SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END) AS total_expenses
       FROM transactions
       WHERE account_id IN (?)
       GROUP BY account_id`,
      [ids]
    );

    const txnMap = {};
    txnTotals.forEach(t => {
      txnMap[t.account_id] = {
        income:   Number(t.total_income)   || 0,
        expenses: Number(t.total_expenses) || 0,
      };
    });

    res.json(accounts.map(a => {
      const t = txnMap[a.id] || { income: 0, expenses: 0 };
      const balance = +((Number(a.initial_balance) || 0) + t.income - t.expenses).toFixed(2);
      return {
        ...a,
        balance,
        type_label: TYPE_LABEL[a.type] || a.type,
      };
    }));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error interno' });
  }
}

export async function create(req, res) {
  const uid = req.userId;
  const { name, type = 'checking', initial_balance = 0, currency = 'USD', color = '#6366f1', notes } = req.body;
  try {
    const [result] = await pool.query(
      `INSERT INTO bank_accounts (user_id, name, type, initial_balance, currency, color, notes)
       VALUES (?,?,?,?,?,?,?)`,
      [uid, name, type, initial_balance, currency, color, notes || null]
    );
    const [[account]] = await pool.query(
      'SELECT * FROM bank_accounts WHERE id = ?', [result.insertId]
    );
    res.status(201).json({
      ...account,
      balance: Number(account.initial_balance),
      type_label: TYPE_LABEL[account.type] || account.type,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error interno' });
  }
}

export async function update(req, res) {
  const { id } = req.params;
  const uid = req.userId;
  const { name, type, initial_balance, currency, color, notes, is_active } = req.body;
  try {
    const [[check]] = await pool.query(
      'SELECT id FROM bank_accounts WHERE id = ? AND user_id = ?', [id, uid]
    );
    if (!check) return res.status(404).json({ error: 'No encontrado' });

    await pool.query(
      `UPDATE bank_accounts SET name=?, type=?, initial_balance=?, currency=?, color=?, notes=?, is_active=? WHERE id=?`,
      [name, type, initial_balance, currency || 'USD', color, notes || null, is_active ?? 1, id]
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Error interno' });
  }
}

export async function remove(req, res) {
  const { id } = req.params;
  const uid = req.userId;
  try {
    const [[check]] = await pool.query(
      'SELECT id FROM bank_accounts WHERE id = ? AND user_id = ?', [id, uid]
    );
    if (!check) return res.status(404).json({ error: 'No encontrado' });
    await pool.query('DELETE FROM bank_accounts WHERE id = ?', [id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Error interno' });
  }
}

export async function getTransactions(req, res) {
  const { id } = req.params;
  const uid = req.userId;
  const { page = 1, limit = 50 } = req.query;
  const offset = (page - 1) * limit;
  try {
    const [[check]] = await pool.query(
      'SELECT id FROM bank_accounts WHERE id = ? AND user_id = ?', [id, uid]
    );
    if (!check) return res.status(404).json({ error: 'No encontrado' });

    const [[{ total }]] = await pool.query(
      'SELECT COUNT(*) AS total FROM transactions WHERE account_id = ?', [id]
    );
    const [rows] = await pool.query(
      `SELECT t.*, c.name AS category_name, c.icon, c.color
       FROM transactions t
       JOIN categories c ON c.id = t.category_id
       WHERE t.account_id = ?
       ORDER BY t.txn_date DESC, t.id DESC
       LIMIT ? OFFSET ?`,
      [id, Number(limit), Number(offset)]
    );
    res.json({ data: rows, total });
  } catch (err) {
    res.status(500).json({ error: 'Error interno' });
  }
}
