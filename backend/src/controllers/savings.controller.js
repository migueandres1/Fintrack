import pool from '../config/db.js';

export async function list(req, res) {
  try {
    const [goals] = await pool.query(
      'SELECT * FROM savings_goals WHERE user_id=? ORDER BY created_at DESC', [req.userId]
    );
    res.json(goals);
  } catch (err) {
    res.status(500).json({ error: 'Error interno' });
  }
}

export async function getOne(req, res) {
  const { id } = req.params;
  try {
    const [[goal]] = await pool.query(
      'SELECT * FROM savings_goals WHERE id=? AND user_id=?', [id, req.userId]
    );
    if (!goal) return res.status(404).json({ error: 'No encontrado' });

    const [contributions] = await pool.query(
      'SELECT * FROM savings_contributions WHERE goal_id=? ORDER BY contrib_date DESC', [id]
    );
    res.json({ ...goal, contributions });
  } catch (err) {
    res.status(500).json({ error: 'Error interno' });
  }
}

export async function create(req, res) {
  const { name, target_amount, deadline, icon = 'piggy-bank', color = '#6366f1' } = req.body;
  try {
    const [result] = await pool.query(
      'INSERT INTO savings_goals (user_id, name, target_amount, deadline, icon, color) VALUES (?,?,?,?,?,?)',
      [req.userId, name, target_amount, deadline, icon, color]
    );
    const [[goal]] = await pool.query('SELECT * FROM savings_goals WHERE id=?', [result.insertId]);
    res.status(201).json(goal);
  } catch (err) {
    res.status(500).json({ error: 'Error interno' });
  }
}

export async function update(req, res) {
  const { id } = req.params;
  const { name, target_amount, deadline, icon, color } = req.body;
  try {
    const [[check]] = await pool.query('SELECT id FROM savings_goals WHERE id=? AND user_id=?', [id, req.userId]);
    if (!check) return res.status(404).json({ error: 'No encontrado' });

    await pool.query(
      'UPDATE savings_goals SET name=?, target_amount=?, deadline=?, icon=?, color=? WHERE id=?',
      [name, target_amount, deadline, icon, color, id]
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Error interno' });
  }
}

export async function remove(req, res) {
  const { id } = req.params;
  try {
    const [[check]] = await pool.query('SELECT id FROM savings_goals WHERE id=? AND user_id=?', [id, req.userId]);
    if (!check) return res.status(404).json({ error: 'No encontrado' });
    await pool.query('DELETE FROM savings_goals WHERE id=?', [id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Error interno' });
  }
}

export async function addContribution(req, res) {
  const { id } = req.params;
  const { amount, contrib_date, notes } = req.body;
  try {
    const [[goal]] = await pool.query('SELECT * FROM savings_goals WHERE id=? AND user_id=?', [id, req.userId]);
    if (!goal) return res.status(404).json({ error: 'No encontrado' });

    const [result] = await pool.query(
      'INSERT INTO savings_contributions (goal_id, amount, contrib_date, notes) VALUES (?,?,?,?)',
      [id, amount, contrib_date, notes]
    );

    const newAmount = +(goal.current_amount + amount).toFixed(2);
    const isCompleted = newAmount >= goal.target_amount ? 1 : 0;
    await pool.query(
      'UPDATE savings_goals SET current_amount=?, is_completed=? WHERE id=?',
      [newAmount, isCompleted, id]
    );

    res.status(201).json({ contribution_id: result.insertId, new_amount: newAmount, is_completed: isCompleted === 1 });
  } catch (err) {
    res.status(500).json({ error: 'Error interno' });
  }
}
