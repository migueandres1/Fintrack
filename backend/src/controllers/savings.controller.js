import pool from '../config/db.js';

export async function list(req, res) {
  try {
    const [goals] = await pool.query(
      `SELECT sg.*, ba.name AS account_name, ba.color AS account_color
       FROM savings_goals sg
       LEFT JOIN bank_accounts ba ON ba.id = sg.account_id
       WHERE sg.user_id = ? ORDER BY sg.created_at DESC`,
      [req.userId]
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
      `SELECT sg.*, ba.name AS account_name, ba.color AS account_color
       FROM savings_goals sg
       LEFT JOIN bank_accounts ba ON ba.id = sg.account_id
       WHERE sg.id = ? AND sg.user_id = ?`,
      [id, req.userId]
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
  const { name, target_amount, deadline, icon = 'piggy-bank', color = '#6366f1', account_id } = req.body;
  const deadlineVal = deadline ? String(deadline).slice(0, 10) : null;
  try {
    const [result] = await pool.query(
      'INSERT INTO savings_goals (user_id, name, target_amount, deadline, icon, color, account_id) VALUES (?,?,?,?,?,?,?)',
      [req.userId, name, target_amount, deadlineVal, icon, color, account_id || null]
    );
    const [[goal]] = await pool.query(
      `SELECT sg.*, ba.name AS account_name FROM savings_goals sg
       LEFT JOIN bank_accounts ba ON ba.id = sg.account_id WHERE sg.id=?`,
      [result.insertId]
    );
    res.status(201).json(goal);
  } catch (err) {
    console.error('[savings.create]', err);
    res.status(500).json({ error: 'Error interno' });
  }
}

export async function update(req, res) {
  const { id } = req.params;
  const { name, target_amount, deadline, icon, color, account_id } = req.body;
  const deadlineVal = deadline ? String(deadline).slice(0, 10) : null;
  try {
    const [[check]] = await pool.query('SELECT id FROM savings_goals WHERE id=? AND user_id=?', [id, req.userId]);
    if (!check) return res.status(404).json({ error: 'No encontrado' });

    await pool.query(
      'UPDATE savings_goals SET name=?, target_amount=?, deadline=?, icon=?, color=?, account_id=? WHERE id=?',
      [name, target_amount, deadlineVal, icon, color, account_id || null, id]
    );
    res.json({ success: true });
  } catch (err) {
    console.error('[savings.update]', err);
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

    const newAmount = +(Number(goal.current_amount) + Number(amount)).toFixed(2);
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

// Helper: recalculate goal current_amount from contributions sum
async function recalcGoal(goalId) {
  const [[{ total }]] = await pool.query(
    'SELECT COALESCE(SUM(amount), 0) AS total FROM savings_contributions WHERE goal_id = ?', [goalId]
  );
  const [[goal]] = await pool.query('SELECT target_amount FROM savings_goals WHERE id = ?', [goalId]);
  const isCompleted = +total >= Number(goal.target_amount) ? 1 : 0;
  await pool.query(
    'UPDATE savings_goals SET current_amount = ?, is_completed = ? WHERE id = ?',
    [+total, isCompleted, goalId]
  );
  return +total;
}

// PUT /savings/contributions/:contribId
export async function updateContribution(req, res) {
  const { contribId } = req.params;
  const { amount, contrib_date, notes } = req.body;
  try {
    const [[contrib]] = await pool.query(
      `SELECT sc.*, sg.user_id FROM savings_contributions sc
       JOIN savings_goals sg ON sg.id = sc.goal_id
       WHERE sc.id = ?`, [contribId]
    );
    if (!contrib || contrib.user_id !== req.userId) {
      return res.status(404).json({ error: 'No encontrado' });
    }
    await pool.query(
      'UPDATE savings_contributions SET amount=?, contrib_date=?, notes=? WHERE id=?',
      [amount, contrib_date, notes ?? contrib.notes, contribId]
    );
    const newAmount = await recalcGoal(contrib.goal_id);
    res.json({ success: true, new_amount: newAmount });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error interno' });
  }
}

// DELETE /savings/contributions/:contribId
export async function deleteContribution(req, res) {
  const { contribId } = req.params;
  try {
    const [[contrib]] = await pool.query(
      `SELECT sc.*, sg.user_id FROM savings_contributions sc
       JOIN savings_goals sg ON sg.id = sc.goal_id
       WHERE sc.id = ?`, [contribId]
    );
    if (!contrib || contrib.user_id !== req.userId) {
      return res.status(404).json({ error: 'No encontrado' });
    }
    await pool.query('DELETE FROM savings_contributions WHERE id = ?', [contribId]);
    const newAmount = await recalcGoal(contrib.goal_id);
    res.json({ success: true, new_amount: newAmount });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error interno' });
  }
}
