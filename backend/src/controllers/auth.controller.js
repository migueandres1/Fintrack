import bcrypt   from 'bcrypt';
import jwt       from 'jsonwebtoken';
import pool      from '../config/db.js';

const sign = (id) =>
  jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN || '7d' });

export async function register(req, res) {
  const { name, email, password, currency = 'USD' } = req.body;
  try {
    const [rows] = await pool.query('SELECT id FROM users WHERE email = ?', [email]);
    if (rows.length) return res.status(409).json({ error: 'Email ya registrado' });

    const hash = await bcrypt.hash(password, 12);
    const [result] = await pool.query(
      'INSERT INTO users (name, email, password_hash, currency) VALUES (?,?,?,?)',
      [name, email, hash, currency]
    );
    const user = { id: result.insertId, name, email, currency, onboarding_completed: 0 };
    res.status(201).json({ token: sign(user.id), user });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error interno' });
  }
}

export async function login(req, res) {
  const { email, password } = req.body;
  try {
    const [rows] = await pool.query(
      'SELECT id, name, email, password_hash, currency, dark_mode, onboarding_completed FROM users WHERE email = ?',
      [email]
    );
    const user = rows[0];
    if (!user) return res.status(401).json({ error: 'Credenciales incorrectas' });

    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) return res.status(401).json({ error: 'Credenciales incorrectas' });

    const { password_hash, ...safe } = user;
    res.json({ token: sign(user.id), user: safe });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error interno' });
  }
}

export async function me(req, res) {
  try {
    const [rows] = await pool.query(
      'SELECT id, name, email, currency, dark_mode, onboarding_completed, created_at FROM users WHERE id = ?',
      [req.userId]
    );
    if (!rows.length) return res.status(404).json({ error: 'Usuario no encontrado' });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Error interno' });
  }
}

export async function completeOnboarding(req, res) {
  try {
    await pool.query('UPDATE users SET onboarding_completed = 1 WHERE id = ?', [req.userId]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Error interno' });
  }
}

export async function updateProfile(req, res) {
  const { name, currency, dark_mode } = req.body;
  try {
    await pool.query(
      'UPDATE users SET name=?, currency=?, dark_mode=? WHERE id=?',
      [name, currency, dark_mode ? 1 : 0, req.userId]
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Error interno' });
  }
}

export async function changePassword(req, res) {
  const { current_password, new_password } = req.body;
  if (!current_password || !new_password) {
    return res.status(400).json({ error: 'Faltan campos requeridos' });
  }
  if (new_password.length < 8) {
    return res.status(400).json({ error: 'La nueva contraseña debe tener al menos 8 caracteres' });
  }
  try {
    const [rows] = await pool.query('SELECT password_hash FROM users WHERE id = ?', [req.userId]);
    if (!rows.length) return res.status(404).json({ error: 'Usuario no encontrado' });

    const valid = await bcrypt.compare(current_password, rows[0].password_hash);
    if (!valid) return res.status(401).json({ error: 'Contraseña actual incorrecta' });

    const hash = await bcrypt.hash(new_password, 12);
    await pool.query('UPDATE users SET password_hash = ? WHERE id = ?', [hash, req.userId]);
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error interno' });
  }
}
