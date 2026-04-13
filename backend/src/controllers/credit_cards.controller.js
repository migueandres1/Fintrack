import pool from '../config/db.js';
import { getUserFamily, ownershipClause, resourceAccessClause } from '../utils/family.js';

export async function list(req, res) {
  const uid = req.userId;
  try {
    const fam = await getUserFamily(uid);
    const fid = fam?.family_id ?? null;
    const { clause, params } = ownershipClause(uid, fid);

    const [cards] = await pool.query(
      `SELECT *, ${fid ? 'family_id IS NOT NULL' : 'FALSE'} AS is_shared
       FROM credit_cards WHERE ${clause} ORDER BY created_at DESC`,
      params
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
        is_shared: Boolean(c.is_shared),
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
  const { name, last_four, credit_limit, billing_day, due_day, color, notes, initial_balance, shared = false } = req.body;
  const conn = await pool.getConnection();
  try {
    let familyId = null;
    if (shared) {
      const fam = await getUserFamily(uid);
      if (!fam) return res.status(400).json({ error: 'No perteneces a un grupo familiar' });
      familyId = fam.family_id;
    }

    await conn.beginTransaction();

    const [result] = await conn.query(
      `INSERT INTO credit_cards (user_id, family_id, name, last_four, credit_limit, billing_day, due_day, color, notes)
       VALUES (?,?,?,?,?,?,?,?,?)`,
      [uid, familyId, name, last_four || null, credit_limit || 0, billing_day || 1, due_day || 20, color || '#6366f1', notes || null]
    );
    const cardId = result.insertId;

    const initBalance = Number(initial_balance) || 0;
    if (initBalance > 0) {
      const [[debtCat]] = await conn.query(
        `SELECT id FROM categories WHERE (user_id IS NULL OR user_id = ?) AND type = 'expense' AND name IN ('Deuda','Otros gastos') ORDER BY name = 'Deuda' DESC LIMIT 1`,
        [uid]
      );
      const catId = debtCat?.id || 15;
      const today = new Date().toISOString().slice(0, 10);
      await conn.query(
        `INSERT INTO transactions (user_id, family_id, category_id, type, amount, description, txn_date, credit_card_id, is_card_payment)
         VALUES (?, ?, ?, 'expense', ?, 'Saldo inicial', ?, ?, 0)`,
        [uid, familyId, catId, initBalance, today, cardId]
      );
    }

    await conn.commit();
    const [[card]] = await conn.query('SELECT * FROM credit_cards WHERE id = ?', [cardId]);
    res.status(201).json({ ...card, is_shared: Boolean(card.family_id), current_balance: initBalance, utilization: credit_limit > 0 ? +((initBalance / Number(credit_limit)) * 100).toFixed(1) : 0 });
  } catch (err) {
    await conn.rollback();
    console.error(err);
    res.status(500).json({ error: 'Error interno' });
  } finally {
    conn.release();
  }
}

export async function update(req, res) {
  const { id } = req.params;
  const uid = req.userId;
  const { name, last_four, credit_limit, billing_day, due_day, color, notes } = req.body;
  try {
    const fam = await getUserFamily(uid);
    const fid = fam?.family_id ?? null;
    const { clause, params } = resourceAccessClause(id, uid, fid);

    const [[check]] = await pool.query(`SELECT id FROM credit_cards WHERE ${clause}`, params);
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
    const fam = await getUserFamily(uid);
    const fid = fam?.family_id ?? null;
    const { clause, params } = resourceAccessClause(id, uid, fid);

    const [[check]] = await pool.query(`SELECT id FROM credit_cards WHERE ${clause}`, params);
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
    const fam = await getUserFamily(uid);
    const fid = fam?.family_id ?? null;
    const { clause, params } = resourceAccessClause(id, uid, fid);

    const [[check]] = await pool.query(`SELECT id FROM credit_cards WHERE ${clause}`, params);
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

export async function addPayment(req, res) {
  const { id } = req.params;
  const uid = req.userId;
  const { amount, txn_date, notes, category_id, account_id } = req.body;
  try {
    const fam = await getUserFamily(uid);
    const fid = fam?.family_id ?? null;
    const { clause, params } = resourceAccessClause(id, uid, fid);

    const [[card]] = await pool.query(`SELECT * FROM credit_cards WHERE ${clause}`, params);
    if (!card) return res.status(404).json({ error: 'No encontrado' });

    // Verificar que la cuenta bancaria pertenece al usuario (si se proporcionó)
    let resolvedAccountId = null;
    if (account_id) {
      const { clause: aClause, params: aParams } = resourceAccessClause(account_id, uid, fid);
      const [[acct]] = await pool.query(`SELECT id FROM bank_accounts WHERE ${aClause}`, aParams);
      if (acct) resolvedAccountId = acct.id;
    }

    const [result] = await pool.query(
      `INSERT INTO transactions
         (user_id, family_id, category_id, type, amount, description, txn_date,
          credit_card_id, account_id, is_card_payment)
       VALUES (?,?,?,?,?,?,?,?,?,1)`,
      [uid, card.family_id, category_id || 12, 'expense', amount,
       notes || `Pago ${card.name}`, txn_date, id, resolvedAccountId]
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
