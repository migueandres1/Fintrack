-- Migración 001: Vincular debt_payments y savings_contributions a su transacción origen
-- Ejecutar una sola vez en bases de datos existentes.
-- Las instalaciones nuevas ya lo tienen en schema.sql.

ALTER TABLE debt_payments
  ADD COLUMN transaction_id INT UNSIGNED NULL AFTER debt_id,
  ADD INDEX idx_dpay_txn (transaction_id);

ALTER TABLE savings_contributions
  ADD COLUMN transaction_id INT UNSIGNED NULL AFTER goal_id,
  ADD INDEX idx_contrib_txn (transaction_id);
