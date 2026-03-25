-- Tabla de cuentas bancarias
CREATE TABLE IF NOT EXISTS bank_accounts (
  id              INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id         INT UNSIGNED  NOT NULL,
  name            VARCHAR(120)  NOT NULL,
  type            ENUM('checking','savings','cash','investment') NOT NULL DEFAULT 'checking',
  initial_balance DECIMAL(14,2) NOT NULL DEFAULT 0,
  color           CHAR(7)       NOT NULL DEFAULT '#6366f1',
  notes           VARCHAR(255),
  is_active       TINYINT(1)    NOT NULL DEFAULT 1,
  created_at      TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at      TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_account_user (user_id)
);

-- Vincular transacciones a cuentas
ALTER TABLE transactions
  ADD COLUMN account_id INT UNSIGNED NULL AFTER credit_card_id,
  ADD CONSTRAINT fk_txn_account FOREIGN KEY (account_id) REFERENCES bank_accounts(id) ON DELETE SET NULL,
  ADD INDEX idx_txn_account (account_id);
