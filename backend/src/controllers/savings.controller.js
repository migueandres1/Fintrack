import pool from '../config/db.js';
import { getUserFamily, ownershipClause, resourceAccessClause } from '../utils/family.js';

export async function list(req, res) {
  const uid = req.userId;
  try {
    const fam = await getUserFamily(uid);
    const fid = fam?.family_id ?? null;
    const sgClause = fid ? '(sg.user_id = ? OR sg.family_id = ?)' : 'sg.user_id = ?';
    const sgParams = fid ? [uid, fid] : [uid];

    const [goals] = await pool.query(
      `SELECT sg.*, ba.name AS account_name, ba.color AS account_color,
              ${fid ? 'sg.family_id IS NOT NULL' : 'FALSE'} AS is_shared
       FROM savings_goals sg
       LEFT JOIN bank_accounts ba ON ba.id = sg.account_id
       WHERE ${sgClause} ORDER BY sg.created_at DESC`,
      sgParams
    );
    res.json(goals.map(g => ({ ...g, is_shared: Boolean(g.is_shared) })));
  } catch (err) {
    console.error('[savings.list]', err);
    res.status(500).json({ error: 'Error interno' });
  }
}

export async function getOne(req, res) {
  const { id } = req.params;
  const uid = req.userId;
  try {
    const fam = await getUserFamily(uid);
    const fid = fam?.family_id ?? null;
    const sgClause = fid
      ? 'sg.id = ? AND (sg.user_id = ? OR sg.family_id = ?)'
      : 'sg.id = ? AND sg.user_id = ?';
    const sgParams = fid ? [id, uid, fid] : [id, uid];

    const [[goal]] = await pool.query(
      `SELECT sg.*, ba.name AS account_name, ba.color AS account_color
       FROM savings_goals sg
       LEFT JOIN bank_accounts ba ON ba.id = sg.account_id
       WHERE ${sgClause}`,
      sgParams
    );
    if (!goal) return res.status(404).json({ error: 'No encontrado' });

    const [contributions] = await pool.query(
      'SELECT * FROM savings_contributions WHERE goal_id=? ORDER BY contrib_date DESC', [id]
    );
    res.json({ ...goal, is_shared: Boolean(goal.family_id), contributions });
  } catch (err) {
    res.status(500).json({ error: 'Error interno' });
  }
}

export async function create(req, res) {
  const uid = req.userId;
  const { name, target_amount, deadline, icon = 'piggy-bank', color = '#6366f1', account_id, shared = false } = req.body;
  const deadlineVal = deadline ? String(deadline).slice(0, 10) : null;
  try {
    let familyId = null;
    if (shared) {
      const fam = await getUserFamily(uid);
      if (!fam) return res.status(400).json({ error: 'No perteneces a un grupo familiar' });
      familyId = fam.family_id;
    }

    const [result] = await pool.query(
      'INSERT INTO savings_goals (user_id, family_id, name, target_amount, deadline, icon, color, account_id) VALUES (?,?,?,?,?,?,?,?)',
      [uid, familyId, name, target_amount, deadlineVal, icon, color, account_id || null]
    );
    const [[goal]] = await pool.query(
      `SELECT sg.*, ba.name AS account_name FROM savings_goals sg
       LEFT JOIN bank_accounts ba ON ba.id = sg.account_id WHERE sg.id=?`,
      [result.insertId]
    );
    res.status(201).json({ ...goal, is_shared: Boolean(goal.family_id) });
  } catch (err) {
    console.error('[savings.create]', err);
    res.status(500).json({ error: 'Error interno' });
  }
}

export async function update(req, res) {
  const { id } = req.params;
  const uid = req.userId;
  const { name, target_amount, deadline, icon, color, account_id } = req.body;
  const deadlineVal = deadline ? String(deadline).slice(0, 10) : null;
  try {
    const fam = await getUserFamily(uid);
    const fid = fam?.family_id ?? null;
    const { clause, params } = resourceAccessClause(id, uid, fid);

    const [[check]] = await pool.query(`SELECT id FROM savings_goals WHERE ${clause}`, params);
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
  const uid = req.userId;
  try {
    const fam = await getUserFamily(uid);
    const fid = fam?.family_id ?? null;
    const { clause, params } = resourceAccessClause(id, uid, fid);

    const [[check]] = await pool.query(`SELECT id FROM savings_goals WHERE ${clause}`, params);
    if (!check) return res.status(404).json({ error: 'No encontrado' });
    await pool.query('DELETE FROM savings_goals WHERE id=?', [id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Error interno' });
  }
}

export async function addContribution(req, res) {
  const { id } = req.params;
  const uid = req.userId;
  const { amount, contrib_date, notes, account_id } = req.body;
  try {
    const fam = await getUserFamily(uid);
    const fid = fam?.family_id ?? null;
    const { clause, params } = resourceAccessClause(id, uid, fid);

    const [[goal]] = await pool.query(`SELECT * FROM savings_goals WHERE ${clause}`, params);
    if (!goal) return res.status(404).json({ error: 'No encontrado' });

    // Usar la cuenta vinculada a la meta si no se envió otra explícitamente
    const targetAccountId = account_id || goal.account_id || null;

    const conn = await pool.getConnection();
    let contribId;
    try {
      await conn.beginTransaction();

      const [result] = await conn.query(
        'INSERT INTO savings_contributions (goal_id, amount, contrib_date, notes) VALUES (?,?,?,?)',
        [id, amount, contrib_date, notes || null]
      );
      contribId = result.insertId;

      const newAmount = +(Number(goal.current_amount) + Number(amount)).toFixed(2);
      const isCompleted = newAmount >= Number(goal.target_amount) ? 1 : 0;
      await conn.query(
        'UPDATE savings_goals SET current_amount=?, is_completed=? WHERE id=?',
        [newAmount, isCompleted, id]
      );

      // Si hay cuenta bancaria, crear transacción de egreso para descontar el saldo
      if (targetAccountId) {
        // Buscar categoría de ahorros (fallback a primera categoría de gasto del usuario)
        const [[savingsCat]] = await conn.query(
          `SELECT id FROM categories
           WHERE (user_id IS NULL OR user_id = ?) AND type = 'expense'
             AND name IN ('Ahorros','Ahorro','Transferencia','Savings')
           ORDER BY user_id DESC LIMIT 1`,
          [uid]
        );
        const [[fallbackCat]] = await conn.query(
          `SELECT id FROM categories WHERE (user_id IS NULL OR user_id = ?) AND type = 'expense' LIMIT 1`,
          [uid]
        );
        const catId = savingsCat?.id || fallbackCat?.id;

        if (catId) {
          await conn.query(
            `INSERT INTO transactions
               (user_id, family_id, category_id, type, amount, description, txn_date, account_id, savings_goal_id)
             VALUES (?,?,?,?,?,?,?,?,?)`,
            [
              uid, goal.family_id || null, catId, 'expense',
              amount,
              notes || `Aporte: ${goal.name}`,
              contrib_date, targetAccountId, id,
            ]
          );
        }
      }

      await conn.commit();
      res.status(201).json({
        contribution_id: contribId,
        new_amount: +(Number(goal.current_amount) + Number(amount)).toFixed(2),
        is_completed: (+(Number(goal.current_amount) + Number(amount)).toFixed(2)) >= Number(goal.target_amount),
      });
    } catch (err) {
      await conn.rollback();
      throw err;
    } finally {
      conn.release();
    }
  } catch (err) {
    console.error('[savings.addContribution]', err);
    res.status(500).json({ error: 'Error interno' });
  }
}

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

export async function updateContribution(req, res) {
  const { contribId } = req.params;
  const uid = req.userId;
  const { amount, contrib_date, notes } = req.body;
  try {
    const fam = await getUserFamily(uid);
    const fid = fam?.family_id ?? null;

    const [[contrib]] = await pool.query(
      `SELECT sc.*, sg.user_id, sg.family_id FROM savings_contributions sc
       JOIN savings_goals sg ON sg.id = sc.goal_id
       WHERE sc.id = ?`, [contribId]
    );
    const owned = contrib && (contrib.user_id === uid || (fid && contrib.family_id === fid));
    if (!owned) return res.status(404).json({ error: 'No encontrado' });

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

export async function deleteContribution(req, res) {
  const { contribId } = req.params;
  const uid = req.userId;
  try {
    const fam = await getUserFamily(uid);
    const fid = fam?.family_id ?? null;

    const [[contrib]] = await pool.query(
      `SELECT sc.*, sg.user_id, sg.family_id FROM savings_contributions sc
       JOIN savings_goals sg ON sg.id = sc.goal_id
       WHERE sc.id = ?`, [contribId]
    );
    const owned = contrib && (contrib.user_id === uid || (fid && contrib.family_id === fid));
    if (!owned) return res.status(404).json({ error: 'No encontrado' });

    await pool.query('DELETE FROM savings_contributions WHERE id = ?', [contribId]);
    const newAmount = await recalcGoal(contrib.goal_id);
    res.json({ success: true, new_amount: newAmount });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error interno' });
  }
}
