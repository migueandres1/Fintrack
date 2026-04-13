import { useEffect, useState } from 'react';
import {
  Users, UserPlus, Crown, LogOut, Trash2, Copy,
  Check, Mail, AlertTriangle, Settings,
} from 'lucide-react';
import { useStore } from '../store/index.js';

// ── Helpers ───────────────────────────────────────────────────────────────────

function Avatar({ name, size = 'md' }) {
  const sz = size === 'sm' ? 'w-7 h-7 text-xs' : 'w-9 h-9 text-sm';
  return (
    <div className={`${sz} rounded-full bg-brand-500/20 flex items-center justify-center text-brand-400 font-bold shrink-0`}>
      {name?.[0]?.toUpperCase() || '?'}
    </div>
  );
}

function RoleBadge({ role }) {
  if (role === 'owner') {
    return (
      <span className="flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-400 border border-amber-500/20">
        <Crown size={9} /> Dueño
      </span>
    );
  }
  return (
    <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-[var(--border)] text-[var(--text-muted)] border border-[var(--border)]">
      Miembro
    </span>
  );
}

function CopyToken({ token, familyName }) {
  const [copied, setCopied] = useState(false);
  const link = `${window.location.origin}/join?token=${token}`;

  function copy() {
    navigator.clipboard.writeText(link).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  return (
    <button
      onClick={copy}
      className="flex items-center gap-1.5 text-xs text-brand-400 hover:text-brand-300 transition-colors"
    >
      {copied ? <Check size={13} className="text-green-400" /> : <Copy size={13} />}
      {copied ? 'Copiado' : 'Copiar link'}
    </button>
  );
}

// ── Empty state — no family yet ───────────────────────────────────────────────

function NoFamily({ onCreate }) {
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr]   = useState('');

  async function handleCreate(e) {
    e.preventDefault();
    if (!name.trim()) return;
    setBusy(true); setErr('');
    try { await onCreate(name.trim()); }
    catch (error) { setErr(error.response?.data?.error || 'Error al crear el grupo'); }
    finally { setBusy(false); }
  }

  return (
    <div className="max-w-md mx-auto">
      <div className="text-center mb-8">
        <div className="w-16 h-16 rounded-2xl bg-brand-500/10 flex items-center justify-center mx-auto mb-4">
          <Users size={28} className="text-brand-400" />
        </div>
        <h1 className="text-display font-bold text-xl text-[var(--text)] mb-2">Plan Familiar</h1>
        <p className="text-sm text-[var(--text-muted)]">
          Gestiona las finanzas de tu familia juntos. Hasta 5 miembros, cuentas compartidas y más.
        </p>
      </div>

      <form onSubmit={handleCreate} className="card flex flex-col gap-4">
        <div>
          <label className="label">Nombre del grupo</label>
          <input
            className="input"
            placeholder="Ej: Familia García"
            value={name}
            onChange={e => setName(e.target.value)}
            required
          />
        </div>
        {err && <p className="text-xs text-rose-400">{err}</p>}
        <button type="submit" disabled={busy} className="btn-primary justify-center py-2.5">
          {busy ? 'Creando...' : 'Crear grupo familiar'}
        </button>
      </form>
    </div>
  );
}

// ── Main family view ──────────────────────────────────────────────────────────

function FamilyView({ family, currentUserId, onInvite, onRemove, onRename, onDelete, onCancelInvite }) {
  const isOwner   = family.my_role === 'owner';
  const spotsLeft = family.max_members - family.members.length;

  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteBusy, setInviteBusy]   = useState(false);
  const [inviteErr, setInviteErr]     = useState('');
  const [inviteToken, setInviteToken] = useState(null);

  const [renaming, setRenaming]     = useState(false);
  const [newName, setNewName]       = useState(family.name);
  const [renameBusy, setRenameBusy] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  async function handleInvite(e) {
    e.preventDefault();
    setInviteBusy(true); setInviteErr(''); setInviteToken(null);
    try {
      const result = await onInvite(inviteEmail.trim());
      setInviteToken(result.token);
      setInviteEmail('');
    } catch (error) {
      setInviteErr(error.response?.data?.error || 'Error al invitar');
    } finally {
      setInviteBusy(false);
    }
  }

  async function handleRename(e) {
    e.preventDefault();
    setRenameBusy(true);
    try { await onRename(newName); setRenaming(false); }
    catch { /* ignore */ }
    finally { setRenameBusy(false); }
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">

      {/* Header */}
      <div className="card">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-brand-500/10 flex items-center justify-center">
              <Users size={22} className="text-brand-400" />
            </div>
            {isOwner && renaming ? (
              <form onSubmit={handleRename} className="flex items-center gap-2">
                <input
                  className="input py-1 text-sm"
                  value={newName}
                  onChange={e => setNewName(e.target.value)}
                  autoFocus
                />
                <button type="submit" disabled={renameBusy} className="btn-primary py-1 px-3 text-xs">
                  {renameBusy ? '...' : 'Guardar'}
                </button>
                <button type="button" onClick={() => setRenaming(false)} className="text-xs text-[var(--text-muted)] hover:text-[var(--text)]">
                  Cancelar
                </button>
              </form>
            ) : (
              <div>
                <h1 className="text-display font-bold text-lg text-[var(--text)]">{family.name}</h1>
                <p className="text-xs text-[var(--text-muted)]">
                  {family.members.length} / {family.max_members} miembros
                </p>
              </div>
            )}
          </div>
          {isOwner && !renaming && (
            <button
              onClick={() => setRenaming(true)}
              className="p-2 rounded-lg text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-white/5 transition-colors"
              title="Renombrar grupo"
            >
              <Settings size={16} />
            </button>
          )}
        </div>
      </div>

      {/* Members list — visible para todos */}
      <div className="card">
        <h2 className="text-sm font-semibold text-[var(--text)] mb-4">Miembros</h2>
        <div className="space-y-3">
          {family.members.map(m => (
            <div key={m.id} className="flex items-center gap-3">
              <Avatar name={m.name} />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-[var(--text)] truncate">
                  {m.name} {m.id === currentUserId && <span className="text-[var(--text-muted)] font-normal">(tú)</span>}
                </p>
                <p className="text-xs text-[var(--text-muted)] truncate">{m.email}</p>
              </div>
              <RoleBadge role={m.role} />
              {/* Owner puede quitar a cualquiera; miembro solo puede salir él mismo */}
              {(isOwner && m.id !== currentUserId) && (
                <button
                  onClick={() => onRemove(m.id)}
                  className="p-1.5 rounded-lg text-[var(--text-muted)] hover:text-rose-500 hover:bg-rose-500/10 transition-colors"
                  title="Quitar miembro"
                >
                  <Trash2 size={14} />
                </button>
              )}
              {!isOwner && m.id === currentUserId && (
                <button
                  onClick={() => onRemove(m.id)}
                  className="p-1.5 rounded-lg text-[var(--text-muted)] hover:text-rose-500 hover:bg-rose-500/10 transition-colors"
                  title="Salir del grupo"
                >
                  <LogOut size={14} />
                </button>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* ── Solo el dueño ve el resto ─────────────────────────────── */}

      {/* Invite */}
      {isOwner && spotsLeft > 0 && (
        <div className="card">
          <h2 className="text-sm font-semibold text-[var(--text)] mb-1">Invitar miembro</h2>
          <p className="text-xs text-[var(--text-muted)] mb-4">
            Quedan {spotsLeft} {spotsLeft === 1 ? 'lugar' : 'lugares'} disponibles.
          </p>
          <form onSubmit={handleInvite} className="flex gap-2">
            <input
              className="input flex-1"
              type="email"
              placeholder="email@ejemplo.com"
              value={inviteEmail}
              onChange={e => setInviteEmail(e.target.value)}
              required
            />
            <button type="submit" disabled={inviteBusy} className="btn-primary px-4 shrink-0">
              {inviteBusy ? '...' : <UserPlus size={16} />}
            </button>
          </form>
          {inviteErr && <p className="text-xs text-rose-400 mt-2">{inviteErr}</p>}
          {inviteToken && (
            <div className="mt-3 p-3 rounded-xl bg-brand-500/8 border border-brand-500/20">
              <p className="text-xs text-[var(--text-muted)] mb-1.5 flex items-center gap-1.5">
                <Mail size={12} className="text-brand-400" />
                Invitación creada. Compartí este link (expira en 7 días):
              </p>
              <CopyToken token={inviteToken} familyName={family.name} />
            </div>
          )}
        </div>
      )}

      {isOwner && spotsLeft === 0 && (
        <div className="flex items-center gap-2 p-3 rounded-xl bg-amber-500/8 border border-amber-500/20 text-xs text-amber-400">
          <AlertTriangle size={14} className="shrink-0" />
          El grupo está lleno (máx. {family.max_members} miembros).
        </div>
      )}

      {/* Pending invitations */}
      {isOwner && family.invitations.length > 0 && (
        <div className="card">
          <h2 className="text-sm font-semibold text-[var(--text)] mb-4">Invitaciones pendientes</h2>
          <div className="space-y-3">
            {family.invitations.map(inv => (
              <div key={inv.id} className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center">
                  <Mail size={14} className="text-[var(--text-muted)]" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-[var(--text)] truncate">{inv.email}</p>
                  <p className="text-[10px] text-[var(--text-muted)]">
                    Expira {new Date(inv.expires_at).toLocaleDateString()}
                  </p>
                </div>
                <button
                  onClick={() => onCancelInvite(inv.id)}
                  className="p-1.5 rounded-lg text-[var(--text-muted)] hover:text-rose-500 hover:bg-rose-500/10 transition-colors"
                  title="Cancelar invitación"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Danger zone */}
      {isOwner && (
        <div className="card border border-rose-500/20">
          <h2 className="text-sm font-semibold text-rose-400 mb-3">Zona peligrosa</h2>
          {!confirmDelete ? (
            <button
              onClick={() => setConfirmDelete(true)}
              className="flex items-center gap-2 text-sm text-rose-400 hover:text-rose-300 transition-colors"
            >
              <Trash2 size={14} /> Eliminar grupo familiar
            </button>
          ) : (
            <div className="space-y-3">
              <p className="text-xs text-[var(--text-muted)]">
                Se eliminará el grupo. Los miembros perderán el acceso al plan Familiar. ¿Confirmar?
              </p>
              <div className="flex gap-2">
                <button
                  onClick={onDelete}
                  className="text-xs px-3 py-1.5 rounded-lg bg-rose-500 hover:bg-rose-400 text-white transition-colors"
                >
                  Sí, eliminar
                </button>
                <button
                  onClick={() => setConfirmDelete(false)}
                  className="text-xs px-3 py-1.5 rounded-lg bg-white/5 text-[var(--text-muted)] hover:text-[var(--text)] transition-colors"
                >
                  Cancelar
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Join page (from invitation link) ─────────────────────────────────────────

function JoinFromLink({ token, onJoin }) {
  const [busy, setBusy]     = useState(false);
  const [err, setErr]       = useState('');
  const [success, setSuccess] = useState(null);

  async function handle() {
    setBusy(true); setErr('');
    try {
      const result = await onJoin(token);
      setSuccess(result.family_name);
    } catch (error) {
      setErr(error.response?.data?.error || 'Token inválido o expirado');
    } finally {
      setBusy(false);
    }
  }

  if (success) {
    return (
      <div className="max-w-sm mx-auto text-center card">
        <div className="w-12 h-12 rounded-full bg-green-500/15 flex items-center justify-center mx-auto mb-3">
          <Check size={22} className="text-green-400" />
        </div>
        <h2 className="text-display font-bold text-lg text-[var(--text)] mb-1">¡Te uniste!</h2>
        <p className="text-sm text-[var(--text-muted)]">Ahora eres miembro de <strong>{success}</strong>.</p>
      </div>
    );
  }

  return (
    <div className="max-w-sm mx-auto text-center card">
      <div className="w-12 h-12 rounded-2xl bg-brand-500/10 flex items-center justify-center mx-auto mb-3">
        <Users size={22} className="text-brand-400" />
      </div>
      <h2 className="text-display font-bold text-lg text-[var(--text)] mb-1">Invitación familiar</h2>
      <p className="text-sm text-[var(--text-muted)] mb-4">Fuiste invitado a unirte a un grupo familiar en MoniFlow.</p>
      {err && <p className="text-xs text-rose-400 mb-3">{err}</p>}
      <button onClick={handle} disabled={busy} className="btn-primary w-full justify-center py-2.5">
        {busy ? 'Uniéndose...' : 'Aceptar invitación'}
      </button>
    </div>
  );
}

// ── Page entry point ──────────────────────────────────────────────────────────

export default function Family() {
  const {
    user, family, familyLoading,
    fetchFamily, createFamily, updateFamilyName, deleteFamily,
    inviteMember, removeFamilyMember, cancelFamilyInvitation,
    billingStatus,
  } = useStore();

  useEffect(() => { fetchFamily(); }, []);

  const effectivePlan = billingStatus?.plan ?? user?.plan ?? 'free';
  const hasFamiliaPlan = effectivePlan === 'familia';

  if (familyLoading) {
    return (
      <div className="flex items-center justify-center py-20 text-[var(--text-muted)] text-sm">
        Cargando...
      </div>
    );
  }

  // No familia plan
  if (!hasFamiliaPlan && !family) {
    return (
      <div className="max-w-md mx-auto">
        <div className="card border border-amber-500/20 text-center">
          <div className="w-12 h-12 rounded-2xl bg-amber-500/10 flex items-center justify-center mx-auto mb-3">
            <Users size={22} className="text-amber-400" />
          </div>
          <h2 className="text-display font-bold text-base text-[var(--text)] mb-1">Plan Familiar requerido</h2>
          <p className="text-sm text-[var(--text-muted)] mb-4">
            El plan Familiar permite gestionar finanzas con hasta 5 personas.
          </p>
          <a href="/app/pricing" className="btn-primary justify-center py-2.5 inline-flex">
            Ver planes
          </a>
        </div>
      </div>
    );
  }

  if (!family) {
    return (
      <div className="max-w-2xl mx-auto pt-4">
        <NoFamily onCreate={createFamily} />
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto pt-4">
      <FamilyView
        family={family}
        currentUserId={user?.id}
        onInvite={inviteMember}
        onRemove={async (userId) => {
          await removeFamilyMember(userId);
          if (userId === user?.id) {
            // Left the family — reload
            await fetchFamily();
          }
        }}
        onRename={updateFamilyName}
        onDelete={async () => {
          await deleteFamily();
        }}
        onCancelInvite={cancelFamilyInvitation}
      />
    </div>
  );
}
