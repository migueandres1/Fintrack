-- ─────────────────────────────────────────────────────────────────────────
-- Migration 010: Billing / Plan management
-- Agrega columnas de plan y Stripe a la tabla users.
-- Durante la fase Beta todos los usuarios tienen plan = 'beta'.
-- ─────────────────────────────────────────────────────────────────────────

ALTER TABLE users
  ADD COLUMN plan                  ENUM('free','beta','pro','familia') NOT NULL DEFAULT 'beta',
  ADD COLUMN stripe_customer_id    VARCHAR(255) NULL,
  ADD COLUMN stripe_subscription_id VARCHAR(255) NULL,
  ADD COLUMN trial_ends_at         TIMESTAMP NULL,
  ADD COLUMN beta_expires_at       TIMESTAMP NULL;

-- Todos los usuarios existentes quedan en beta
UPDATE users SET plan = 'beta';
