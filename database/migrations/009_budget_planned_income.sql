CREATE TABLE IF NOT EXISTS budget_planned_income (
  id          INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id     INT UNSIGNED NOT NULL,
  month       CHAR(7) NOT NULL,
  description VARCHAR(120) NOT NULL DEFAULT 'Ingreso',
  amount      DECIMAL(14,2) NOT NULL,
  created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX (user_id, month),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
