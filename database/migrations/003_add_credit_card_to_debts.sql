ALTER TABLE debts
  ADD COLUMN credit_card_id INT UNSIGNED NULL AFTER user_id,
  ADD CONSTRAINT fk_debt_card FOREIGN KEY (credit_card_id) REFERENCES credit_cards(id) ON DELETE SET NULL,
  ADD INDEX idx_debt_card (credit_card_id);
