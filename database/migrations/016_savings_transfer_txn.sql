-- Migration 016 — transfer_txn_id en savings_contributions
-- Permite rastrear la transacción de ingreso al destino cuando un aporte
-- se registra como una transferencia entre cuentas (cuenta origen → cuenta meta).

ALTER TABLE savings_contributions
  ADD COLUMN transfer_txn_id INT UNSIGNED NULL
    COMMENT 'Transacción de ingreso a la cuenta destino de la meta (para aportes tipo transferencia)'
    AFTER transaction_id,
  ADD KEY idx_contrib_transfer (transfer_txn_id),
  ADD CONSTRAINT fk_contrib_transfer FOREIGN KEY (transfer_txn_id)
    REFERENCES transactions(id) ON DELETE SET NULL;
