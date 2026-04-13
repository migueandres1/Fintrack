/**
 * family.controller.js — Gestión del grupo familiar (Plan Familiar).
 *
 * Endpoints:
 *   GET    /api/family              → info del grupo + miembros
 *   POST   /api/family              → crear grupo (soy el owner)
 *   PUT    /api/family              → renombrar grupo (owner)
 *   DELETE /api/family              → eliminar grupo (owner)
 *   POST   /api/family/invite       → invitar por email
 *   GET    /api/family/join/:token  → aceptar invitación
 *   DELETE /api/family/members/:uid → quitar miembro (owner) o salir (yo mismo)
 */
import crypto from 'crypto';
import pool   from '../config/db.js';

const MAX_MEMBERS = 5;

// ── Helpers internos ──────────────────────────────────────────────────────

async function getMembership(userId) {
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

async function countMembers(familyId) {
  const [[{ n }]] = await pool.query(
    'SELECT COUNT(*) n FROM family_members WHERE family_id = ?',
    [familyId]
  );
  return Number(n);
}

// ── GET /api/family ───────────────────────────────────────────────────────

export async function getFamily(req, res) {
  try {
    const membership = await getMembership(req.userId);
    if (!membership) return res.json(null);

    const { family_id } = membership;

    const [members] = await pool.query(
      `SELECT u.id, u.name, u.email, u.currency, fm.role, fm.joined_at
       FROM family_members fm
       JOIN users u ON u.id = fm.user_id
       WHERE fm.family_id = ?
       ORDER BY fm.joined_at ASC`,
      [family_id]
    );

    const [invitations] = await pool.query(
      `SELECT fi.id, fi.email, fi.status, fi.expires_at, fi.created_at,
              u.name AS invited_by_name
       FROM family_invitations fi
       JOIN users u ON u.id = fi.invited_by
       WHERE fi.family_id = ? AND fi.status = 'pending'
         AND fi.expires_at > NOW()
       ORDER BY fi.created_at DESC`,
      [family_id]
    );

    res.json({
      id:         family_id,
      name:       membership.name,
      owner_id:   membership.owner_id,
      my_role:    membership.role,
      members,
      invitations,
      max_members: MAX_MEMBERS,
    });
  } catch (err) {
    console.error('[family.getFamily]', err);
    res.status(500).json({ error: 'Error interno' });
  }
}

// ── POST /api/family ──────────────────────────────────────────────────────

export async function createFamily(req, res) {
  const uid = req.userId;
  const { name } = req.body;
  if (!name?.trim()) return res.status(400).json({ error: 'El nombre del grupo es requerido' });

  try {
    // Un usuario solo puede pertenecer a un grupo
    const existing = await getMembership(uid);
    if (existing) {
      return res.status(409).json({ error: 'Ya perteneces a un grupo familiar' });
    }

    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();
      const [r] = await conn.query(
        'INSERT INTO families (name, owner_id) VALUES (?, ?)',
        [name.trim(), uid]
      );
      const familyId = r.insertId;
      await conn.query(
        'INSERT INTO family_members (family_id, user_id, role) VALUES (?, ?, ?)',
        [familyId, uid, 'owner']
      );
      await conn.commit();
      res.status(201).json({ id: familyId, name: name.trim(), owner_id: uid, my_role: 'owner', members: [], invitations: [], max_members: MAX_MEMBERS });
    } catch (err) {
      await conn.rollback();
      throw err;
    } finally {
      conn.release();
    }
  } catch (err) {
    console.error('[family.createFamily]', err);
    res.status(500).json({ error: 'Error interno' });
  }
}

// ── PUT /api/family ───────────────────────────────────────────────────────

export async function updateFamily(req, res) {
  const { name } = req.body;
  if (!name?.trim()) return res.status(400).json({ error: 'El nombre es requerido' });

  try {
    const membership = await getMembership(req.userId);
    if (!membership) return res.status(404).json({ error: 'No perteneces a un grupo familiar' });
    if (membership.role !== 'owner') return res.status(403).json({ error: 'Solo el dueño puede modificar el grupo' });

    await pool.query('UPDATE families SET name = ? WHERE id = ?', [name.trim(), membership.family_id]);
    res.json({ success: true });
  } catch (err) {
    console.error('[family.updateFamily]', err);
    res.status(500).json({ error: 'Error interno' });
  }
}

// ── DELETE /api/family ────────────────────────────────────────────────────

export async function deleteFamily(req, res) {
  try {
    const membership = await getMembership(req.userId);
    if (!membership) return res.status(404).json({ error: 'No perteneces a un grupo familiar' });
    if (membership.role !== 'owner') return res.status(403).json({ error: 'Solo el dueño puede eliminar el grupo' });

    const { family_id } = membership;

    // Bajar plan a 'free' de todos los miembros (no owners, sin suscripción propia)
    await pool.query(
      `UPDATE users SET plan = 'free'
       WHERE id IN (
         SELECT user_id FROM family_members WHERE family_id = ? AND role = 'member'
       ) AND stripe_subscription_id IS NULL`,
      [family_id]
    );

    // Eliminar el grupo (cascade borra family_members e invitations;
    // los recursos compartidos quedan con family_id = NULL gracias a ON DELETE SET NULL)
    await pool.query('DELETE FROM families WHERE id = ?', [family_id]);
    res.json({ success: true });
  } catch (err) {
    console.error('[family.deleteFamily]', err);
    res.status(500).json({ error: 'Error interno' });
  }
}

// ── POST /api/family/invite ───────────────────────────────────────────────

export async function invite(req, res) {
  const { email } = req.body;
  if (!email?.trim()) return res.status(400).json({ error: 'El email es requerido' });

  try {
    const membership = await getMembership(req.userId);
    if (!membership) return res.status(404).json({ error: 'No perteneces a un grupo familiar' });
    if (membership.role !== 'owner') return res.status(403).json({ error: 'Solo el dueño puede invitar miembros' });

    const { family_id } = membership;

    // Verificar límite de miembros
    const currentCount = await countMembers(family_id);
    if (currentCount >= MAX_MEMBERS) {
      return res.status(403).json({ error: `El grupo ya tiene el máximo de ${MAX_MEMBERS} miembros` });
    }

    // Verificar que el email no sea ya miembro
    const [[existingMember]] = await pool.query(
      `SELECT fm.id FROM family_members fm
       JOIN users u ON u.id = fm.user_id
       WHERE fm.family_id = ? AND u.email = ?`,
      [family_id, email.trim().toLowerCase()]
    );
    if (existingMember) return res.status(409).json({ error: 'Este usuario ya es miembro del grupo' });

    // Cancelar invitaciones previas pendientes al mismo email
    await pool.query(
      "UPDATE family_invitations SET status = 'expired' WHERE family_id = ? AND email = ? AND status = 'pending'",
      [family_id, email.trim().toLowerCase()]
    );

    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 días

    await pool.query(
      'INSERT INTO family_invitations (family_id, email, token, invited_by, expires_at) VALUES (?,?,?,?,?)',
      [family_id, email.trim().toLowerCase(), token, req.userId, expiresAt]
    );

    // Devolvemos el token para que el frontend genere el link de invitación
    res.status(201).json({ token, email: email.trim().toLowerCase(), expires_at: expiresAt });
  } catch (err) {
    console.error('[family.invite]', err);
    res.status(500).json({ error: 'Error interno' });
  }
}

// ── POST /api/family/join ─────────────────────────────────────────────────
// Body: { token }

export async function join(req, res) {
  const { token } = req.body;
  if (!token) return res.status(400).json({ error: 'Token requerido' });

  try {
    const uid = req.userId;

    // El usuario no puede estar ya en otro grupo
    const alreadyMember = await getMembership(uid);
    if (alreadyMember) {
      return res.status(409).json({ error: 'Ya perteneces a un grupo familiar. Debes salir antes de unirte a otro.' });
    }

    const [[inv]] = await pool.query(
      `SELECT fi.*, f.name AS family_name
       FROM family_invitations fi
       JOIN families f ON f.id = fi.family_id
       WHERE fi.token = ? AND fi.status = 'pending' AND fi.expires_at > NOW()`,
      [token]
    );
    if (!inv) return res.status(404).json({ error: 'Invitación inválida o expirada' });

    // Verificar que el usuario registrado tiene el email correcto
    const [[me]] = await pool.query('SELECT email FROM users WHERE id = ?', [uid]);
    if (me.email.toLowerCase() !== inv.email.toLowerCase()) {
      return res.status(403).json({ error: 'Esta invitación fue enviada a otro email' });
    }

    // Verificar límite
    const currentCount = await countMembers(inv.family_id);
    if (currentCount >= MAX_MEMBERS) {
      return res.status(403).json({ error: `El grupo ya está lleno (máx. ${MAX_MEMBERS} miembros)` });
    }

    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();
      await conn.query(
        'INSERT INTO family_members (family_id, user_id, role) VALUES (?, ?, ?)',
        [inv.family_id, uid, 'member']
      );
      await conn.query(
        "UPDATE family_invitations SET status = 'accepted' WHERE id = ?",
        [inv.id]
      );
      // Elevar el plan del nuevo miembro a 'familia'
      await conn.query(
        'UPDATE users SET plan = ? WHERE id = ?',
        ['familia', uid]
      );
      await conn.commit();
    } catch (err) {
      await conn.rollback();
      throw err;
    } finally {
      conn.release();
    }

    res.json({ success: true, family_name: inv.family_name, family_id: inv.family_id });
  } catch (err) {
    console.error('[family.join]', err);
    res.status(500).json({ error: 'Error interno' });
  }
}

// ── DELETE /api/family/members/:userId ────────────────────────────────────
// Owner quita a alguien, o el propio miembro sale del grupo.

export async function removeMember(req, res) {
  const targetUserId = Number(req.params.userId);
  const uid = req.userId;

  try {
    const membership = await getMembership(uid);
    if (!membership) return res.status(404).json({ error: 'No perteneces a un grupo familiar' });

    const { family_id, role } = membership;

    // Solo el owner puede quitar a otros; cualquiera puede quitarse a sí mismo
    if (targetUserId !== uid && role !== 'owner') {
      return res.status(403).json({ error: 'No tienes permiso para quitar miembros' });
    }

    // El owner no puede salir sin transferir propiedad o eliminar el grupo
    if (targetUserId === uid && role === 'owner') {
      return res.status(400).json({ error: 'El dueño no puede salir del grupo. Eliminá el grupo o transferí la propiedad.' });
    }

    await pool.query(
      'DELETE FROM family_members WHERE family_id = ? AND user_id = ?',
      [family_id, targetUserId]
    );

    // Bajar plan a 'free' del miembro removido (solo si no tiene suscripción propia)
    await pool.query(
      "UPDATE users SET plan = 'free' WHERE id = ? AND stripe_subscription_id IS NULL",
      [targetUserId]
    );

    res.json({ success: true });
  } catch (err) {
    console.error('[family.removeMember]', err);
    res.status(500).json({ error: 'Error interno' });
  }
}

// ── DELETE /api/family/invitations/:id ───────────────────────────────────

export async function cancelInvitation(req, res) {
  const { id } = req.params;
  try {
    const membership = await getMembership(req.userId);
    if (!membership) return res.status(404).json({ error: 'No perteneces a un grupo familiar' });
    if (membership.role !== 'owner') return res.status(403).json({ error: 'Solo el dueño puede cancelar invitaciones' });

    await pool.query(
      "UPDATE family_invitations SET status = 'expired' WHERE id = ? AND family_id = ?",
      [id, membership.family_id]
    );
    res.json({ success: true });
  } catch (err) {
    console.error('[family.cancelInvitation]', err);
    res.status(500).json({ error: 'Error interno' });
  }
}
