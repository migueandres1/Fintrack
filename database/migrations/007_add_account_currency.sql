-- Agregar moneda propia a cada cuenta bancaria
ALTER TABLE bank_accounts
  ADD COLUMN currency CHAR(3) NOT NULL DEFAULT 'USD' AFTER initial_balance;
