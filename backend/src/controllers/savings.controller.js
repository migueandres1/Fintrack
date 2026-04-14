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

    // Cuenta origen (de donde sale el dinero) y cuenta destino (donde se guarda en la meta)
    const sourceAccountId = account_id ? Number(account_id) : null;
    const destAccountId   = goal.account_id ? Number(goal.account_id) : null;

    const conn = await pool.getConnection();
    let contribId;
    try {
      await conn.beginTransaction();

      // 1. Registrar la contribución
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

      // 2. Buscar categorías para las transacciones
      const [[expenseCat]] = await conn.query(
        `SELECT id FROM categories
         WHERE (user_id IS NULL OR user_id = ?) AND type = 'expense'
           AND name IN ('Ahorros','Ahorro','Transferencia','Savings')
         ORDER BY user_id DESC LIMIT 1`,
        [uid]
      );
      const [[fallbackExpCat]] = await conn.query(
        `SELECT id FROM categories WHERE (user_id IS NULL OR user_id = ?) AND type = 'expense' LIMIT 1`,
        [uid]
      );
      const expCatId = expenseCat?.id || fallbackExpCat?.id;

      const [[incomeCat]] = await conn.query(
        `SELECT id FROM categories
         WHERE (user_id IS NULL OR user_id = ?) AND type = 'income'
           AND name IN ('Transferencia','Ahorros','Ingresos','Savings')
         ORDER BY user_id DESC LIMIT 1`,
        [uid]
      );
      const [[fallbackIncCat]] = await conn.query(
        `SELECT id FROM categories WHERE (user_id IS NULL OR user_id = ?) AND type = 'income' LIMIT 1`,
        [uid]
      );
      const incCatId = incomeCat?.id || fallbackIncCat?.id;

      const desc = notes || `Aporte: ${goal.name}`;

      // 3. Egreso de la cuenta origen (disminuye su saldo)
      if (sourceAccountId && expCatId) {
        const [txnResult] = await conn.query(
          `INSERT INTO transactions
             (user_id, family_id, category_id, type, amount, description, txn_date, account_id, savings_goal_id)
           VALUES (?,?,?,?,?,?,?,?,?)`,
          [uid, goal.family_id || null, expCatId, 'expense', amount, desc, contrib_date, sourceAccountId, id]
        );
        // Vincular transacción de egreso a la contribución
        await conn.query(
          'UPDATE savings_contributions SET transaction_id = ? WHERE id = ?',
          [txnResult.insertId, contribId]
        );
      }

      // 4. Ingreso a la cuenta destino de la meta (aumenta su saldo), solo si es distinta a la origen
      if (destAccountId && destAccountId !== sourceAccountId && incCatId) {
        const [transferResult] = await conn.query(
          `INSERT INTO transactions
             (user_id, family_id, category_id, type, amount, description, txn_date, account_id)
           VALUES (?,?,?,?,?,?,?,?)`,
          [uid, goal.family_id || null, incCatId, 'income', amount, desc, contrib_date, destAccountId]
        );
        // Vincular transacción de ingreso a la contribución
        await conn.query(
          'UPDATE savings_contributions SET transfer_txn_id = ? WHERE id = ?',
          [transferResult.insertId, contribId]
        );
      }

      await conn.commit();
      res.status(201).json({
        contribution_id: contribId,
        new_amount: newAmount,
        is_completed: newAmount >= Number(goal.target_amount),
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
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const fam = await getUserFamily(uid);
    const fid = fam?.family_id ?? null;

    const [[contrib]] = await conn.query(
      `SELECT sc.*, sg.user_id, sg.family_id FROM savings_contributions sc
       JOIN savings_goals sg ON sg.id = sc.goal_id
       WHERE sc.id = ?`, [contribId]
    );
    const owned = contrib && (contrib.user_id === uid || (fid && contrib.family_id === fid));
    if (!owned) {
      await conn.rollback();
      return res.status(404).json({ error: 'No encontrado' });
    }

    const { transaction_id, transfer_txn_id, goal_id } = contrib;

    // 1. Eliminar la contribución
    await conn.query('DELETE FROM savings_contributions WHERE id = ?', [contribId]);

    // 2. Recalcular el monto de la meta
    const [[{ total }]] = await conn.query(
      'SELECT COALESCE(SUM(amount), 0) AS total FROM savings_contributions WHERE goal_id = ?', [goal_id]
    );
    const [[goal]] = await conn.query('SELECT target_amount FROM savings_goals WHERE id = ?', [goal_id]);
    const newTotal = +Number(total).toFixed(2);
    await conn.query(
      'UPDATE savings_goals SET current_amount = ?, is_completed = ? WHERE id = ?',
      [newTotal, newTotal >= Number(goal.target_amount) ? 1 : 0, goal_id]
    );

    // 3. Eliminar la transacción de egreso vinculada (si existe)
    if (transaction_id) {
      await conn.query('DELETE FROM transactions WHERE id = ?', [transaction_id]);
    }

    // 4. Eliminar la transacción de ingreso (transferencia) vinculada (si existe)
    if (transfer_txn_id) {
      await conn.query('DELETE FROM transactions WHERE id = ?', [transfer_txn_id]);
    }

    await conn.commit();
    res.json({ success: true, new_amount: newTotal });
  } catch (err) {
    await conn.rollback();
    console.error(err);
    res.status(500).json({ error: 'Error interno' });
  } finally {
    conn.release();
  }
}
