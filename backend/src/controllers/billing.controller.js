import Stripe from 'stripe';
import pool   from '../config/db.js';
import { getEffectivePlan } from '../middleware/planGuard.js';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || 'sk_test_placeholder');

// Price IDs configurados en Stripe Dashboard y en .env
const PRICES = {
  pro_monthly:      process.env.STRIPE_PRICE_PRO_MONTHLY,
  pro_annual:       process.env.STRIPE_PRICE_PRO_ANNUAL,
  familia_monthly:  process.env.STRIPE_PRICE_FAMILIA_MONTHLY,
  familia_annual:   process.env.STRIPE_PRICE_FAMILIA_ANNUAL,
};

// ── Helpers ─────────────────────────────────────────────────────────────────
function planFromPriceId(priceId) {
  if (!priceId) return 'free';
  if ([PRICES.pro_monthly, PRICES.pro_annual].includes(priceId))         return 'pro';
  if ([PRICES.familia_monthly, PRICES.familia_annual].includes(priceId)) return 'familia';
  return 'free';
}

async function userIdFromCustomer(customerId) {
  const [rows] = await pool.query(
    'SELECT id FROM users WHERE stripe_customer_id = ?',
    [customerId]
  );
  return rows[0]?.id || null;
}

async function ensureStripeCustomer(userId) {
  const [rows] = await pool.query(
    'SELECT email, name, stripe_customer_id FROM users WHERE id = ?',
    [userId]
  );
  const user = rows[0];
  if (!user) throw new Error('Usuario no encontrado');

  if (user.stripe_customer_id) return user.stripe_customer_id;

  const customer = await stripe.customers.create({
    email: user.email,
    name:  user.name,
    metadata: { user_id: String(userId) },
  });

  await pool.query(
    'UPDATE users SET stripe_customer_id = ? WHERE id = ?',
    [customer.id, userId]
  );
  return customer.id;
}

// ── POST /api/billing/sync ───────────────────────────────────────────────────
// Llama a Stripe con el session_id que devuelve el success_url y actualiza el plan
// en la BD inmediatamente, sin esperar el webhook.
export async function syncCheckout(req, res) {
  const { session_id } = req.body;
  if (!session_id) return res.status(400).json({ error: 'session_id requerido' });

  try {
    const session = await stripe.checkout.sessions.retrieve(session_id, {
      expand: ['subscription'],
    });

    // Verificar que la sesión pertenece al usuario autenticado
    if (String(session.metadata?.user_id) !== String(req.userId)) {
      return res.status(403).json({ error: 'Sesión no válida' });
    }

    if (session.payment_status !== 'paid' && session.subscription?.status !== 'trialing') {
      return res.json({ synced: false, reason: 'payment_not_completed' });
    }

    const sub  = session.subscription;
    const plan = planFromPriceId(sub?.items?.data[0]?.price?.id);

    await pool.query(
      `UPDATE users SET plan = ?, stripe_subscription_id = ?, subscription_status = ?, trial_ends_at = ? WHERE id = ?`,
      [
        plan,
        sub?.id    || null,
        sub?.status || 'trialing',
        sub?.trial_end ? new Date(sub.trial_end * 1000) : null,
        req.userId,
      ]
    );

    res.json({ synced: true, plan });
  } catch (err) {
    console.error('billing.syncCheckout:', err);
    res.status(500).json({ error: 'Error al sincronizar suscripción' });
  }
}

// ── GET /api/billing/status ──────────────────────────────────────────────────
export async function getStatus(req, res) {
  try {
    const [rows] = await pool.query(
      `SELECT plan, stripe_customer_id, stripe_subscription_id,
              trial_ends_at, beta_expires_at, subscription_status
       FROM users WHERE id = ?`,
      [req.userId]
    );
    const user = rows[0];
    if (!user) return res.status(404).json({ error: 'Usuario no encontrado' });

    const effectivePlan = getEffectivePlan(user);

    // Actualizar BD si plan expiró (beta o trial)
    if (user.plan !== 'free' && effectivePlan === 'free') {
      await pool.query('UPDATE users SET plan = ? WHERE id = ?', ['free', req.userId]);
    }

    // ¿La prueba gratis terminó sin pago confirmado?
    const trialEnd    = user.trial_ends_at ? new Date(user.trial_ends_at) : null;
    const subStatus   = user.subscription_status;
    const trialExpired = trialEnd && trialEnd < new Date() && (
      !user.stripe_subscription_id ||
      (subStatus && !['active'].includes(subStatus))
    );

    // Días restantes de beta global
    const globalExpiry = process.env.BETA_EXPIRES_AT
      ? new Date(process.env.BETA_EXPIRES_AT)
      : null;
    const betaDaysLeft = globalExpiry
      ? Math.max(0, Math.ceil((globalExpiry - new Date()) / 86400000))
      : null;

    res.json({
      plan:             effectivePlan,
      raw_plan:         user.plan,
      trial_ends_at:    user.trial_ends_at,
      trial_expired:    !!trialExpired,
      beta_expires_at:  globalExpiry,
      beta_days_left:   betaDaysLeft,
      is_beta:          effectivePlan === 'beta',
      is_paid:          ['pro', 'familia'].includes(effectivePlan),
      has_subscription: !!user.stripe_subscription_id,
    });
  } catch (err) {
    console.error('billing.getStatus:', err);
    res.status(500).json({ error: 'Error interno' });
  }
}

// ── POST /api/billing/checkout ───────────────────────────────────────────────
export async function createCheckout(req, res) {
  const { price_key } = req.body; // 'pro_monthly' | 'pro_annual' | ...
  const priceId = PRICES[price_key];
  if (!priceId) return res.status(400).json({ error: 'Plan no válido' });

  try {
    const customerId = await ensureStripeCustomer(req.userId);

    const session = await stripe.checkout.sessions.create({
      customer:             customerId,
      mode:                 'subscription',
      payment_method_types: ['card'],
      line_items:           [{ price: priceId, quantity: 1 }],
      subscription_data: {
        trial_period_days: 30, // 30 días gratis al registrarse
        metadata:          { user_id: String(req.userId) },
      },
      success_url: `${process.env.FRONTEND_URL}/app/billing/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url:  `${process.env.FRONTEND_URL}/pricing`,
      metadata:    { user_id: String(req.userId) },
      allow_promotion_codes: true,
    });

    res.json({ url: session.url });
  } catch (err) {
    console.error('billing.createCheckout:', err);
    res.status(500).json({ error: 'Error al crear sesión de pago' });
  }
}

// ── POST /api/billing/portal ─────────────────────────────────────────────────
export async function createPortal(req, res) {
  try {
    const [rows] = await pool.query(
      'SELECT stripe_customer_id FROM users WHERE id = ?',
      [req.userId]
    );
    const customerId = rows[0]?.stripe_customer_id;
    if (!customerId) {
      return res.status(400).json({ error: 'No tienes una suscripción activa' });
    }

    const session = await stripe.billingPortal.sessions.create({
      customer:   customerId,
      return_url: `${process.env.FRONTEND_URL}/app/profile`,
    });

    res.json({ url: session.url });
  } catch (err) {
    console.error('billing.createPortal:', err);
    res.status(500).json({ error: 'Error al abrir portal de facturación' });
  }
}

// ── POST /api/billing/webhook ────────────────────────────────────────────────
// IMPORTANTE: esta ruta debe recibir el body como raw Buffer (express.raw)
// para que Stripe pueda verificar la firma. Se registra en index.js antes
// de express.json().
export async function handleWebhook(req, res) {
  const sig = req.headers['stripe-signature'];

  let event;
  try {
    event = stripe.webhooks.constructEvent(
      req.body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    console.error('Webhook signature failed:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  const { type, data: { object: obj } } = event;

  try {
    // ── Pago completado (checkout) ──────────────────────────────────────
    if (type === 'checkout.session.completed') {
      const userId = parseInt(obj.metadata.user_id);
      const sub    = await stripe.subscriptions.retrieve(obj.subscription);
      const plan   = planFromPriceId(sub.items.data[0].price.id);

      await pool.query(
        `UPDATE users SET plan = ?, stripe_subscription_id = ?,
                          subscription_status = ?, trial_ends_at = ?
         WHERE id = ?`,
        [
          plan,
          obj.subscription,
          sub.status,
          sub.trial_end ? new Date(sub.trial_end * 1000) : null,
          userId,
        ]
      );
    }

    // ── Suscripción actualizada ─────────────────────────────────────────
    if (type === 'customer.subscription.updated') {
      const userId = await userIdFromCustomer(obj.customer);
      if (!userId) return res.json({ received: true });

      const plan   = planFromPriceId(obj.items.data[0].price.id);
      const status = obj.status; // active | trialing | past_due | canceled

      if (['active', 'trialing'].includes(status)) {
        await pool.query(
          'UPDATE users SET plan = ?, subscription_status = ?, trial_ends_at = ? WHERE id = ?',
          [plan, status, obj.trial_end ? new Date(obj.trial_end * 1000) : null, userId]
        );
      } else {
        // past_due, unpaid, canceled, paused → degradar a free
        await pool.query(
          'UPDATE users SET plan = ?, subscription_status = ? WHERE id = ?',
          ['free', status, userId]
        );
      }
    }

    // ── Suscripción cancelada ───────────────────────────────────────────
    if (type === 'customer.subscription.deleted') {
      const userId = await userIdFromCustomer(obj.customer);
      if (userId) {
        await pool.query(
          'UPDATE users SET plan = ?, stripe_subscription_id = NULL, subscription_status = ? WHERE id = ?',
          ['free', 'canceled', userId]
        );
      }
    }

    // ── Pago exitoso (trial → active) ──────────────────────────────────
    if (type === 'invoice.paid') {
      const userId = await userIdFromCustomer(obj.customer);
      if (userId && obj.subscription) {
        await pool.query(
          'UPDATE users SET subscription_status = ? WHERE stripe_subscription_id = ? AND id = ?',
          ['active', obj.subscription, userId]
        );
      }
    }

    // ── Pago fallido ────────────────────────────────────────────────────
    if (type === 'invoice.payment_failed') {
      const userId = await userIdFromCustomer(obj.customer);
      if (userId) {
        console.warn(`Pago fallido para usuario ${userId}`);
        await pool.query(
          'UPDATE users SET subscription_status = ? WHERE id = ?',
          ['past_due', userId]
        );
      }
    }
  } catch (err) {
    console.error('Webhook handler error:', err);
  }

  res.json({ received: true });
}
