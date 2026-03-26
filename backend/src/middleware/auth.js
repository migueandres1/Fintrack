import jwt  from 'jsonwebtoken';
import pool from '../config/db.js';

export const authenticate = (req, res, next) => {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer '))
    return res.status(401).json({ error: 'Token requerido' });

  const token = header.split(' ')[1];
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    req.userId = payload.id;
    next();
  } catch {
    res.status(401).json({ error: 'Token inválido o expirado' });
  }
};

export const requireAdmin = async (req, res, next) => {
  try {
    const [rows] = await pool.query('SELECT is_admin FROM users WHERE id = ?', [req.userId]);
    if (!rows[0]?.is_admin) return res.status(403).json({ error: 'Acceso denegado' });
    next();
  } catch (err) {
    next(err);
  }
};
