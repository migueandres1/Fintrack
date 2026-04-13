/**
 * family.js — Helpers para multi-usuario en el plan Familiar.
 *
 * Todos los recursos (cuentas, tarjetas, transacciones, metas) pueden
 * ser "personales" (family_id IS NULL) o "compartidos" (family_id = X).
 * Un miembro del grupo puede leer y editar cualquier recurso compartido.
 */
import pool from '../config/db.js';

/**
 * Devuelve los datos del grupo familiar del usuario, o null si no pertenece a uno.
 * @returns {{ family_id, role, name, owner_id } | null}
 */
export async function getUserFamily(userId) {
  const [[row]] = await pool.query(
    `SELECT fm.family_id, fm.role, f.name, f.owner_id
     FROM family_members fm
     JOIN families f ON f.id = fm.family_id
     WHERE fm.user_id = ?
     LIMIT 1`,
    [userId]
  );
  return row ?? null;
}

/**
 * Genera la cláusula WHERE y los parámetros para listar recursos
 * que pertenecen al usuario O a su grupo familiar.
 *
 * Uso:
 *   const { clause, params } = ownershipClause(uid, fid);
 *   pool.query(`SELECT * FROM bank_accounts WHERE ${clause}`, params);
 */
export function ownershipClause(userId, familyId) {
  if (familyId) {
    return {
      clause: '(user_id = ? OR family_id = ?)',
      params: [userId, familyId],
    };
  }
  return {
    clause: 'user_id = ?',
    params: [userId],
  };
}

/**
 * Cláusula WHERE para acceder a un recurso por id con verificación de propiedad.
 * Acepta el recurso si el usuario lo creó (user_id) O si es del grupo (family_id).
 */
export function resourceAccessClause(id, userId, familyId) {
  if (familyId) {
    return {
      clause: 'id = ? AND (user_id = ? OR family_id = ?)',
      params: [id, userId, familyId],
    };
  }
  return {
    clause: 'id = ? AND user_id = ?',
    params: [id, userId],
  };
}
