-- Migration 017 — transferencias entre cuentas
-- Vincula dos transacciones pareadas (egreso de origen + ingreso a destino)
-- que conforman una transferencia entre cuentas bancarias del usuario.

ALTER TABLE transactions
  ADD COLUMN linked_transfer_txn_id INT UNSIGNED NULL
    COMMENT 'ID de la transacción contraparte en una transferencia entre cuentas'
    AFTER is_card_payment,
  ADD KEY idx_linked_transfer (linked_transfer_txn_id),
  ADD CONSTRAINT fk_linked_transfer FOREIGN KEY (linked_transfer_txn_id)
    REFERENCES transactions(id) ON DELETE SET NULL;
