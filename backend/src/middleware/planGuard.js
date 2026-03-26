/**
 * planGuard.js — Feature gating basado en plan del usuario.
 *
 * Jerarquía:  beta = pro = familia > free
 * Durante Beta: plan='beta' da acceso completo. Cuando BETA_EXPIRES_AT
 * llegue, los usuarios beta son tratados automáticamente como 'free'.
 */
import pool from '../config/db.js';

// ── Límites por plan ────────────────────────────────────────────────────────
export const PLAN_LIMITS = {
  free:    { accounts: 2, cards: 1, goals: 1, tx_month: 50,       ocr: false, debts: false },
  beta:    { accounts: Infinity, cards: Infinity, goals: Infinity, tx_month: Infinity, ocr: true,  debts: true  },
  pro:     { accounts: Infinity, cards: Infinity, goals: Infinity, tx_month: Infinity, ocr: true,  debts: true  },
  familia: { accounts: Infinity, cards: Infinity, goals: Infinity, tx_month: Infinity, ocr: true,  debts: true  },
};

/**
 * Devuelve el plan efectivo del usuario.
 * - Si es 'beta' y el período beta expiró → 'free'
 * - Si es 'pro'/'familia' y la prueba gratis terminó sin suscripción activa → 'free'
 */
export function getEffectivePlan(user) {
  if (!user) return 'free';
  const plan = user.plan || 'free';

  if (plan === 'beta') {
    const globalExpiry = process.env.BETA_EXPIRES_AT
      ? new Date(process.env.BETA_EXPIRES_AT)
      : null;
    const userExpiry = user.beta_expires_at ? new Date(user.beta_expires_at) : null;
    const expiry = userExpiry || globalExpiry;
    if (expiry && expiry < new Date()) return 'free';
  }

  if (['pro', 'familia'].includes(plan)) {
    const trialEnd = user.trial_ends_at ? new Date(user.trial_ends_at) : null;
    const status   = user.subscription_status; // 'trialing'|'active'|'past_due'|'canceled'|null

    // Sin suscripción de Stripe: solo el trial date decide
    if (!user.stripe_subscription_id) {
      if (trialEnd && trialEnd < new Date()) return 'free';
    } else {
      // Con suscripción: el status de Stripe es la fuente de verdad
      const inactive = status && !['trialing', 'active'].includes(status);
      // Trial terminó y aún no hay pago confirmado
      const trialOverNoPayment = trialEnd && trialEnd < new Date() && status === 'trialing';
      if (inactive || trialOverNoPayment) return 'free';
    }
  }

  return plan;
}

export function isPaidPlan(plan) {
  return ['pro', 'familia', 'beta'].includes(plan);
}

// ── Fetch plan y downgrade automático si beta o trial expiraron ───────────
async function fetchUserPlan(userId) {
  const [rows] = await pool.query(
    'SELECT plan, beta_expires_at, trial_ends_at, stripe_subscription_id, subscription_status FROM users WHERE id = ?',
    [userId]
  );
  const user = rows[0] || null;
  if (!user) return null;

  const effective = getEffectivePlan(user);

  // Actualizar BD si el plan efectivo ya no coincide con el almacenado
  if (user.plan !== 'free' && effective === 'free') {
    await pool.query('UPDATE users SET plan = ? WHERE id = ?', ['free', userId]);
    user.plan = 'free';
  }

  return user;
}

// ── Middleware: bloquea si el feature no está en el plan ───────────────────
// feature: 'ocr' | 'debts'
export function requireFeature(feature) {
  return async (req, res, next) => {
    try {
      const user = await fetchUserPlan(req.userId);
      const plan = getEffectivePlan(user);
      req.plan = plan;

      if (!PLAN_LIMITS[plan]?.[feature]) {
        return res.status(403).json({
          error: 'Esta función requiere un plan de pago.',
          code: 'UPGRADE_REQUIRED',
          feature,
          current_plan: plan,
        });
      }
      next();
    } catch (err) {
      console.error('planGuard.requireFeature:', err);
      next(err);
    }
  };
}

// ── Middleware: bloquea si se superó el límite de cantidad ─────────────────
// resource: 'accounts' | 'cards' | 'goals' | 'tx_month'
// countFn: async(userId) => number  —  función que cuenta el recurso actual
export function requireLimit(resource, countFn) {
  return async (req, res, next) => {
    try {
      const user = await fetchUserPlan(req.userId);
      const plan = getEffectivePlan(user);
      req.plan = plan;

      const limit = PLAN_LIMITS[plan]?.[resource];
      if (limit === undefined || limit === Infinity) return next();

      const current = Number(await countFn(req.userId));
      if (current >= limit) {
        return res.status(403).json({
          error: `Límite alcanzado: tu plan permite hasta ${limit} ${resource}.`,
          code: 'LIMIT_REACHED',
          resource,
          limit,
          current,
          current_plan: plan,
        });
      }
      next();
    } catch (err) {
      console.error('planGuard.requireLimit:', err);
      next(err);
    }
  };
}
