-- Migration 012: Agrega subscription_status para trackear el estado real de Stripe
ALTER TABLE users
  ADD COLUMN subscription_status VARCHAR(20) NULL DEFAULT NULL;
-- Valores posibles: trialing | active | past_due | canceled | unpaid | paused | NULL

-- Usuarios que ya tienen suscripción y plan pro/familia los marcamos como trialing
-- (el webhook los actualizará cuando Stripe confirme)
UPDATE users SET subscription_status = 'trialing'
WHERE stripe_subscription_id IS NOT NULL
  AND plan IN ('pro', 'familia');
