import pool from '../config/db.js';

export async function list(req, res) {
  const uid = req.userId;
  try {
    const [cards] = await pool.query(
      'SELECT * FROM credit_cards WHERE user_id = ? ORDER BY created_at DESC',
      [uid]
    );

    if (!cards.length) return res.json([]);

    const ids = cards.map(c => c.id);
    const [txns] = await pool.query(
      `SELECT credit_card_id,
              SUM(CASE WHEN is_card_payment = 0 THEN amount ELSE 0 END) AS purchases,
              SUM(CASE WHEN is_card_payment = 1 THEN amount ELSE 0 END) AS payments
       FROM transactions
       WHERE credit_card_id IN (?)
       GROUP BY credit_card_id`,
      [ids]
    );

    // Saldo bloqueado por deudas enlazadas (compras a meses sin intereses)
    const [linkedDebts] = await pool.query(
      `SELECT credit_card_id, SUM(current_balance) AS debt_total
       FROM debts
       WHERE credit_card_id IN (?) AND is_active = 1
       GROUP BY credit_card_id`,
      [ids]
    );

    const txnMap = {};
    txns.forEach(t => {
      txnMap[t.credit_card_id] = +((Number(t.purchases) || 0) - (Number(t.payments) || 0)).toFixed(2);
    });
    const debtMap = {};
    linkedDebts.forEach(d => { debtMap[d.credit_card_id] = Number(d.debt_total) || 0; });

    res.json(cards.map(c => {
      const current_balance = +((txnMap[c.id] || 0) + (debtMap[c.id] || 0)).toFixed(2);
      return {
        ...c,
        current_balance,
        utilization: c.credit_limit > 0 ? +((current_balance / Number(c.credit_limit)) * 100).toFixed(1) : 0,
      };
    }));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error interno' });
  }
}

export async function create(req, res) {
  const uid = req.userId;
  const { name, last_four, credit_limit, billing_day, due_day, color, notes } = req.body;
  try {
    const [result] = await pool.query(
      `INSERT INTO credit_cards (user_id, name, last_four, credit_limit, billing_day, due_day, color, notes)
       VALUES (?,?,?,?,?,?,?,?)`,
      [uid, name, last_four || null, credit_limit || 0, billing_day || 1, due_day || 20, color || '#6366f1', notes || null]
    );
    const [[card]] = await pool.query('SELECT * FROM credit_cards WHERE id = ?', [result.insertId]);
    res.status(201).json({ ...card, current_balance: 0, utilization: 0 });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error interno' });
  }
}

export async function update(req, res) {
  const { id } = req.params;
  const uid = req.userId;
  const { name, last_four, credit_limit, billing_day, due_day, color, notes } = req.body;
  try {
    const [[check]] = await pool.query('SELECT id FROM credit_cards WHERE id = ? AND user_id = ?', [id, uid]);
    if (!check) return res.status(404).json({ error: 'No encontrado' });

    await pool.query(
      `UPDATE credit_cards SET name=?, last_four=?, credit_limit=?, billing_day=?, due_day=?, color=?, notes=? WHERE id=?`,
      [name, last_four || null, credit_limit || 0, billing_day || 1, due_day || 20, color || '#6366f1', notes || null, id]
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
    const [[check]] = await pool.query('SELECT id FROM credit_cards WHERE id = ? AND user_id = ?', [id, uid]);
    if (!check) return res.status(404).json({ error: 'No encontrado' });
    await pool.query('DELETE FROM credit_cards WHERE id = ?', [id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Error interno' });
  }
}

export async function getTransactions(req, res) {
  const { id } = req.params;
  const uid = req.userId;
  try {
    const [[check]] = await pool.query('SELECT id FROM credit_cards WHERE id = ? AND user_id = ?', [id, uid]);
    if (!check) return res.status(404).json({ error: 'No encontrado' });

    const [rows] = await pool.query(
      `SELECT t.*, c.name AS category_name, c.color, c.icon
       FROM transactions t JOIN categories c ON c.id = t.category_id
       WHERE t.credit_card_id = ?
       ORDER BY t.txn_date DESC LIMIT 50`,
      [id]
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: 'Error interno' });
  }
}

// Registrar pago de tarjeta (reduce saldo de la tarjeta, sí afecta balance real)
export async function addPayment(req, res) {
  const { id } = req.params;
  const uid = req.userId;
  const { amount, txn_date, notes, category_id } = req.body;
  try {
    const [[card]] = await pool.query('SELECT * FROM credit_cards WHERE id = ? AND user_id = ?', [id, uid]);
    if (!card) return res.status(404).json({ error: 'No encontrado' });

    const [result] = await pool.query(
      `INSERT INTO transactions
         (user_id, category_id, type, amount, description, txn_date, credit_card_id, is_card_payment)
       VALUES (?,?,?,?,?,?,?,1)`,
      [uid, category_id || 12, 'expense', amount, notes || `Pago ${card.name}`, txn_date, id]
    );
    const [[txn]] = await pool.query(
      `SELECT t.*, c.name AS category_name, c.color, c.icon
       FROM transactions t JOIN categories c ON c.id = t.category_id
       WHERE t.id = ?`,
      [result.insertId]
    );
    res.status(201).json(txn);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error interno' });
  }
}
