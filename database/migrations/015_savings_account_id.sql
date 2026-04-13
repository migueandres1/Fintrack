-- Migration 015 — account_id en savings_goals
-- Vincula una meta de ahorro a una cuenta bancaria para descontar
-- el saldo automáticamente al registrar un aporte.

ALTER TABLE savings_goals
  ADD COLUMN account_id INT UNSIGNED NULL AFTER family_id,
  ADD KEY    idx_sg_account (account_id),
  ADD CONSTRAINT fk_sg_account FOREIGN KEY (account_id)
    REFERENCES bank_accounts(id) ON DELETE SET NULL;
