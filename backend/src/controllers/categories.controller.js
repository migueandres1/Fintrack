import pool from '../config/db.js';

// GET /categories — solo las visibles (para formularios de transacciones)
export async function listVisible(req, res) {
  const uid = req.userId;
  try {
    const [rows] = await pool.query(
      `SELECT c.*
       FROM categories c
       LEFT JOIN user_hidden_categories h ON h.category_id = c.id AND h.user_id = ?
       WHERE (c.user_id IS NULL OR c.user_id = ?)
         AND h.category_id IS NULL
       ORDER BY c.type, c.name`,
      [uid, uid]
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error interno' });
  }
}

// GET /categories/manage — todas (predeterminadas + propias) con flag is_hidden
export async function listAll(req, res) {
  const uid = req.userId;
  try {
    const [rows] = await pool.query(
      `SELECT c.*,
              CASE WHEN c.user_id IS NULL THEN 'default' ELSE 'custom' END AS source,
              CASE WHEN h.category_id IS NOT NULL THEN 1 ELSE 0 END        AS is_hidden
       FROM categories c
       LEFT JOIN user_hidden_categories h ON h.category_id = c.id AND h.user_id = ?
       WHERE c.user_id IS NULL OR c.user_id = ?
       ORDER BY c.type, c.user_id IS NULL DESC, c.name`,
      [uid, uid]
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error interno' });
  }
}

// POST /categories — crear categoría propia
export async function create(req, res) {
  const uid = req.userId;
  const { name, type, icon = '📦', color = '#6366f1' } = req.body;
  if (!name?.trim()) return res.status(400).json({ error: 'El nombre es requerido' });
  if (!['income', 'expense'].includes(type)) return res.status(400).json({ error: 'Tipo inválido' });
  try {
    const [result] = await pool.query(
      'INSERT INTO categories (user_id, name, type, icon, color) VALUES (?,?,?,?,?)',
      [uid, name.trim(), type, icon, color]
    );
    const [[cat]] = await pool.query('SELECT * FROM categories WHERE id = ?', [result.insertId]);
    res.status(201).json({ ...cat, source: 'custom', is_hidden: 0 });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error interno' });
  }
}

// PUT /categories/:id — editar propia (no predeterminadas)
export async function update(req, res) {
  const { id } = req.params;
  const uid = req.userId;
  const { name, type, icon, color } = req.body;
  try {
    const [[cat]] = await pool.query(
      'SELECT * FROM categories WHERE id = ? AND user_id = ?', [id, uid]
    );
    if (!cat) return res.status(403).json({ error: 'Solo puedes editar tus propias categorías' });
    await pool.query(
      'UPDATE categories SET name=?, type=?, icon=?, color=? WHERE id=?',
      [name ?? cat.name, type ?? cat.type, icon ?? cat.icon, color ?? cat.color, id]
    );
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error interno' });
  }
}

// DELETE /categories/:id — eliminar propia (no predeterminadas)
export async function remove(req, res) {
  const { id } = req.params;
  const uid = req.userId;
  try {
    const [[cat]] = await pool.query(
      'SELECT * FROM categories WHERE id = ? AND user_id = ?', [id, uid]
    );
    if (!cat) return res.status(403).json({ error: 'Solo puedes eliminar tus propias categorías' });
    await pool.query('DELETE FROM categories WHERE id = ?', [id]);
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error interno' });
  }
}

// POST /categories/:id/hide — ocultar predeterminada de la vista del usuario
export async function hide(req, res) {
  const { id } = req.params;
  const uid = req.userId;
  try {
    const [[cat]] = await pool.query(
      'SELECT id FROM categories WHERE id = ? AND user_id IS NULL', [id]
    );
    if (!cat) return res.status(400).json({ error: 'Solo se pueden ocultar categorías predeterminadas' });
    await pool.query(
      'INSERT IGNORE INTO user_hidden_categories (user_id, category_id) VALUES (?,?)',
      [uid, id]
    );
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error interno' });
  }
}

// DELETE /categories/:id/hide — mostrar nuevamente una predeterminada oculta
export async function unhide(req, res) {
  const { id } = req.params;
  const uid = req.userId;
  try {
    await pool.query(
      'DELETE FROM user_hidden_categories WHERE user_id = ? AND category_id = ?',
      [uid, id]
    );
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error interno' });
  }
}
