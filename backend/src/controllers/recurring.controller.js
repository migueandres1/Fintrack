import pool from '../config/db.js';

// Avanza next_date según frecuencia
function advanceDate(dateStr, frequency) {
  const d = new Date(dateStr + 'T00:00:00');
  if (frequency === 'weekly')    d.setDate(d.getDate() + 7);
  if (frequency === 'biweekly')  d.setDate(d.getDate() + 15);
  if (frequency === 'monthly')   d.setMonth(d.getMonth() + 1);
  if (frequency === 'yearly')    d.setFullYear(d.getFullYear() + 1);
  return d.toISOString().split('T')[0];
}

// Calcula la próxima ocurrencia desde hoy usando el día de start_date
function nextOccurrenceFromToday(startDate, frequency) {
  const start = new Date(startDate + 'T00:00:00');
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  if (start >= today) return startDate; // fecha futura, usarla tal cual

  if (frequency === 'monthly') {
    const day = start.getDate();
    let d = new Date(today.getFullYear(), today.getMonth(), day);
    if (d < today) d = new Date(today.getFullYear(), today.getMonth() + 1, day);
    return d.toISOString().split('T')[0];
  }

  if (frequency === 'yearly') {
    let d = new Date(today.getFullYear(), start.getMonth(), start.getDate());
    if (d < today) d = new Date(today.getFullYear() + 1, start.getMonth(), start.getDate());
    return d.toISOString().split('T')[0];
  }

  // weekly / biweekly: avanzar desde start hasta >= hoy
  const days = frequency === 'weekly' ? 7 : 15;
  const d = new Date(start);
  while (d < today) d.setDate(d.getDate() + days);
  return d.toISOString().split('T')[0];
}

// Procesa todas las recurrentes pendientes del usuario (llamado automáticamente)
export async function processRecurring(userId) {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const [pending] = await conn.query(
      `SELECT * FROM recurring_transactions
       WHERE user_id = ? AND is_active = 1 AND next_date <= CURDATE()
         AND (end_date IS NULL OR next_date <= end_date)`,
      [userId]
    );

    for (const rt of pending) {
      const current = rt.next_date instanceof Date
        ? rt.next_date.toISOString().split('T')[0]
        : String(rt.next_date).split('T')[0];

      if (rt.end_date && current > String(rt.end_date).split('T')[0]) continue;

      // Crear la transacción del período actual
      await conn.query(
        `INSERT INTO transactions
           (user_id, category_id, type, amount, description, txn_date, savings_goal_id, credit_card_id)
         VALUES (?,?,?,?,?,?,?,?)`,
        [rt.user_id, rt.category_id, rt.type, rt.amount, rt.description, current, rt.savings_goal_id || null, rt.credit_card_id || null]
      );

      // Si hay meta de ahorro → aporte automático
      if (rt.savings_goal_id) {
        const [[goal]] = await conn.query(
          'SELECT * FROM savings_goals WHERE id = ? AND user_id = ?',
          [rt.savings_goal_id, userId]
        );
        if (goal && !goal.is_completed) {
          const newAmount   = +(goal.current_amount + Number(rt.amount)).toFixed(2);
          const isCompleted = newAmount >= goal.target_amount ? 1 : 0;
          await conn.query(
            'INSERT INTO savings_contributions (goal_id, amount, contrib_date, notes) VALUES (?,?,?,?)',
            [rt.savings_goal_id, rt.amount, current, rt.description]
          );
          await conn.query(
            'UPDATE savings_goals SET current_amount=?, is_completed=? WHERE id=?',
            [newAmount, isCompleted, rt.savings_goal_id]
          );
        }
      }

      const next = advanceDate(current, rt.frequency);
      const expired = rt.end_date && next > String(rt.end_date).split('T')[0];
      await conn.query(
        'UPDATE recurring_transactions SET next_date=?, is_active=? WHERE id=?',
        [next, expired ? 0 : 1, rt.id]
      );
    }

    await conn.commit();
    return pending.length;
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}

export async function list(req, res) {
  try {
    const [rows] = await pool.query(
      `SELECT rt.*, c.name AS category_name, c.icon, c.color
       FROM recurring_transactions rt
       JOIN categories c ON c.id = rt.category_id
       WHERE rt.user_id = ? ORDER BY rt.next_date ASC`,
      [req.userId]
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: 'Error interno' });
  }
}

export async function create(req, res) {
  const { category_id, type, amount, description, frequency, start_date, end_date, savings_goal_id, credit_card_id } = req.body;
  try {
    const next_date = nextOccurrenceFromToday(start_date, frequency);
    const [result] = await pool.query(
      `INSERT INTO recurring_transactions
         (user_id, category_id, type, amount, description, frequency, start_date, next_date, end_date, savings_goal_id, credit_card_id)
       VALUES (?,?,?,?,?,?,?,?,?,?,?)`,
      [req.userId, category_id, type, amount, description, frequency, start_date, next_date, end_date || null, savings_goal_id || null, credit_card_id || null]
    );
    const [rows] = await pool.query(
      `SELECT rt.*, c.name AS category_name, c.icon, c.color
       FROM recurring_transactions rt JOIN categories c ON c.id = rt.category_id
       WHERE rt.id = ?`, [result.insertId]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Error interno' });
  }
}

export async function update(req, res) {
  const { id } = req.params;
  const { category_id, type, amount, description, frequency, end_date, is_active, savings_goal_id, credit_card_id } = req.body;
  try {
    const [check] = await pool.query(
      'SELECT id FROM recurring_transactions WHERE id=? AND user_id=?', [id, req.userId]
    );
    if (!check.length) return res.status(404).json({ error: 'No encontrado' });

    await pool.query(
      `UPDATE recurring_transactions
       SET category_id=?, type=?, amount=?, description=?, frequency=?, end_date=?, is_active=?, savings_goal_id=?, credit_card_id=?
       WHERE id=?`,
      [category_id, type, amount, description, frequency, end_date || null, is_active ?? 1, savings_goal_id || null, credit_card_id || null, id]
    );
    const [rows] = await pool.query(
      `SELECT rt.*, c.name AS category_name, c.icon, c.color
       FROM recurring_transactions rt JOIN categories c ON c.id = rt.category_id
       WHERE rt.id = ?`, [id]
    );
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Error interno' });
  }
}

export async function remove(req, res) {
  const { id } = req.params;
  try {
    const [check] = await pool.query(
      'SELECT id FROM recurring_transactions WHERE id=? AND user_id=?', [id, req.userId]
    );
    if (!check.length) return res.status(404).json({ error: 'No encontrado' });
    await pool.query('DELETE FROM recurring_transactions WHERE id=?', [id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Error interno' });
  }
}
