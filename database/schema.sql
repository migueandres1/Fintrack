-- ============================================================
-- FinTrack – Schema MySQL
-- ============================================================

CREATE DATABASE IF NOT EXISTS fintrack CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE fintrack;

-- ------------------------------------------------------------
-- USUARIOS
-- ------------------------------------------------------------
CREATE TABLE users (
  id            INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  name          VARCHAR(120)  NOT NULL,
  email         VARCHAR(180)  NOT NULL UNIQUE,
  password_hash VARCHAR(255)  NOT NULL,
  currency      CHAR(3)       NOT NULL DEFAULT 'USD',
  dark_mode     TINYINT(1)    NOT NULL DEFAULT 0,
  created_at    TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at    TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- ------------------------------------------------------------
-- CATEGORÍAS
-- ------------------------------------------------------------
CREATE TABLE categories (
  id      INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id INT UNSIGNED,
  name    VARCHAR(80)  NOT NULL,
  type    ENUM('income','expense') NOT NULL,
  icon    VARCHAR(40)  NOT NULL DEFAULT 'circle',
  color   CHAR(7)      NOT NULL DEFAULT '#6366f1',
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

INSERT INTO categories (user_id, name, type, icon, color) VALUES
  (NULL, 'Salario',         'income',  'briefcase',      '#22c55e'),
  (NULL, 'Freelance',       'income',  'laptop',         '#10b981'),
  (NULL, 'Inversiones',     'income',  'trending-up',    '#06b6d4'),
  (NULL, 'Otros ingresos',  'income',  'plus-circle',    '#84cc16'),
  (NULL, 'Alimentación',    'expense', 'utensils',       '#f59e0b'),
  (NULL, 'Transporte',      'expense', 'car',            '#3b82f6'),
  (NULL, 'Vivienda',        'expense', 'home',           '#8b5cf6'),
  (NULL, 'Salud',           'expense', 'heart-pulse',    '#ef4444'),
  (NULL, 'Educación',       'expense', 'graduation',     '#f97316'),
  (NULL, 'Entretenimiento', 'expense', 'gamepad',        '#ec4899'),
  (NULL, 'Ropa',            'expense', 'shirt',          '#a855f7'),
  (NULL, 'Servicios',       'expense', 'zap',            '#14b8a6'),
  (NULL, 'Otros gastos',    'expense', 'more-horizontal','#6b7280'),
  (NULL, 'Ahorro',          'expense', 'piggy-bank',     '#10b981');

-- ------------------------------------------------------------
-- DEUDAS
-- ------------------------------------------------------------
CREATE TABLE debts (
  id               INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id          INT UNSIGNED  NOT NULL,
  name             VARCHAR(120)  NOT NULL,
  initial_balance  DECIMAL(14,2) NOT NULL CHECK (initial_balance > 0),
  current_balance  DECIMAL(14,2) NOT NULL,
  annual_rate      DECIMAL(6,4)  NOT NULL COMMENT 'Tasa anual en decimal, ej: 0.24 = 24%',
  monthly_payment  DECIMAL(14,2) NOT NULL,
  payment_day      TINYINT       NOT NULL DEFAULT 1 COMMENT 'Día del mes en que vence el pago',
  start_date       DATE          NOT NULL,
  is_active        TINYINT(1)    NOT NULL DEFAULT 1,
  notes            TEXT,
  created_at       TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at       TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_debt_user (user_id)
);

-- ------------------------------------------------------------
-- METAS DE AHORRO
-- ------------------------------------------------------------
CREATE TABLE savings_goals (
  id              INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id         INT UNSIGNED  NOT NULL,
  name            VARCHAR(120)  NOT NULL,
  target_amount   DECIMAL(14,2) NOT NULL CHECK (target_amount > 0),
  current_amount  DECIMAL(14,2) NOT NULL DEFAULT 0,
  deadline        DATE,
  icon            VARCHAR(40)   NOT NULL DEFAULT 'piggy-bank',
  color           CHAR(7)       NOT NULL DEFAULT '#6366f1',
  is_completed    TINYINT(1)    NOT NULL DEFAULT 0,
  created_at      TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at      TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_goal_user (user_id)
);

-- ------------------------------------------------------------
-- TARJETAS DE CRÉDITO
-- ------------------------------------------------------------
CREATE TABLE credit_cards (
  id           INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id      INT UNSIGNED  NOT NULL,
  name         VARCHAR(120)  NOT NULL,
  last_four    CHAR(4),
  credit_limit DECIMAL(14,2) NOT NULL DEFAULT 0,
  billing_day  TINYINT       NOT NULL DEFAULT 1  COMMENT 'Día de corte mensual',
  due_day      TINYINT       NOT NULL DEFAULT 20 COMMENT 'Día límite de pago',
  color        CHAR(7)       NOT NULL DEFAULT '#6366f1',
  notes        VARCHAR(255),
  created_at   TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_cc_user (user_id)
);

-- ------------------------------------------------------------
-- TRANSACCIONES
-- (después de debts, savings_goals y credit_cards)
-- ------------------------------------------------------------
CREATE TABLE transactions (
  id              INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id         INT UNSIGNED  NOT NULL,
  category_id     INT UNSIGNED  NOT NULL,
  type            ENUM('income','expense') NOT NULL,
  amount          DECIMAL(14,2) NOT NULL CHECK (amount > 0),
  description     VARCHAR(255),
  txn_date        DATE          NOT NULL,
  debt_id         INT UNSIGNED  NULL COMMENT 'Vinculada a deuda',
  savings_goal_id INT UNSIGNED  NULL COMMENT 'Vinculada a meta de ahorro',
  credit_card_id  INT UNSIGNED  NULL COMMENT 'Cargado a tarjeta de crédito',
  is_card_payment TINYINT(1)    NOT NULL DEFAULT 0 COMMENT '1 = pago de saldo de tarjeta',
  extra_principal DECIMAL(14,2) NOT NULL DEFAULT 0 COMMENT 'Abono extra a capital (solo deudas)',
  created_at      TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id)         REFERENCES users(id)         ON DELETE CASCADE,
  FOREIGN KEY (category_id)     REFERENCES categories(id)    ON DELETE RESTRICT,
  FOREIGN KEY (debt_id)         REFERENCES debts(id)         ON DELETE SET NULL,
  FOREIGN KEY (savings_goal_id) REFERENCES savings_goals(id) ON DELETE SET NULL,
  FOREIGN KEY (credit_card_id)  REFERENCES credit_cards(id)  ON DELETE SET NULL,
  INDEX idx_txn_user_date (user_id, txn_date),
  INDEX idx_txn_type      (type)
);

-- ------------------------------------------------------------
-- PAGOS DE DEUDAS
-- ------------------------------------------------------------
CREATE TABLE debt_payments (
  id              INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  debt_id         INT UNSIGNED  NOT NULL,
  transaction_id  INT UNSIGNED  NULL COMMENT 'Transacción origen (NULL = pago directo)',
  payment_date    DATE          NOT NULL,
  total_amount    DECIMAL(14,2) NOT NULL CHECK (total_amount > 0),
  principal_paid  DECIMAL(14,2) NOT NULL DEFAULT 0,
  interest_paid   DECIMAL(14,2) NOT NULL DEFAULT 0,
  extra_principal DECIMAL(14,2) NOT NULL DEFAULT 0 COMMENT 'Abono extra a capital',
  balance_after   DECIMAL(14,2) NOT NULL,
  notes           TEXT,
  created_at      TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (debt_id)        REFERENCES debts(id)        ON DELETE CASCADE,
  FOREIGN KEY (transaction_id) REFERENCES transactions(id) ON DELETE SET NULL,
  INDEX idx_dpay_debt (debt_id),
  INDEX idx_dpay_txn  (transaction_id),
  INDEX idx_dpay_date (payment_date)
);

-- ------------------------------------------------------------
-- APORTES A METAS
-- ------------------------------------------------------------
CREATE TABLE savings_contributions (
  id             INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  goal_id        INT UNSIGNED  NOT NULL,
  transaction_id INT UNSIGNED  NULL COMMENT 'Transacción origen (NULL = aporte directo)',
  amount         DECIMAL(14,2) NOT NULL CHECK (amount > 0),
  contrib_date   DATE          NOT NULL,
  notes          VARCHAR(255),
  created_at     TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (goal_id)        REFERENCES savings_goals(id) ON DELETE CASCADE,
  FOREIGN KEY (transaction_id) REFERENCES transactions(id)  ON DELETE SET NULL,
  INDEX idx_contrib_goal (goal_id),
  INDEX idx_contrib_txn  (transaction_id)
);

-- ------------------------------------------------------------
-- TRANSACCIONES RECURRENTES
-- ------------------------------------------------------------
CREATE TABLE recurring_transactions (
  id              INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id         INT UNSIGNED  NOT NULL,
  category_id     INT UNSIGNED  NOT NULL,
  type            ENUM('income','expense') NOT NULL,
  amount          DECIMAL(14,2) NOT NULL CHECK (amount > 0),
  description     VARCHAR(255),
  frequency       ENUM('weekly','biweekly','monthly','yearly') NOT NULL DEFAULT 'monthly',
  start_date      DATE          NOT NULL,
  next_date       DATE          NOT NULL,
  end_date        DATE          NULL COMMENT 'NULL = sin fecha de fin',
  is_active       TINYINT(1)    NOT NULL DEFAULT 1,
  savings_goal_id INT UNSIGNED  NULL,
  credit_card_id  INT UNSIGNED  NULL COMMENT 'Cargo recurrente a tarjeta',
  created_at      TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at      TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id)         REFERENCES users(id)         ON DELETE CASCADE,
  FOREIGN KEY (category_id)     REFERENCES categories(id)    ON DELETE RESTRICT,
  FOREIGN KEY (savings_goal_id) REFERENCES savings_goals(id) ON DELETE SET NULL,
  FOREIGN KEY (credit_card_id)  REFERENCES credit_cards(id)  ON DELETE SET NULL,
  INDEX idx_rec_user (user_id),
  INDEX idx_rec_next (next_date, is_active)
);

-- ------------------------------------------------------------
-- PAGOS ADELANTADOS PLANIFICADOS
-- ------------------------------------------------------------
CREATE TABLE debt_planned_payments (
  id           INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  debt_id      INT UNSIGNED  NOT NULL,
  planned_date DATE          NOT NULL,
  amount       DECIMAL(14,2) NOT NULL CHECK (amount > 0),
  notes        VARCHAR(255),
  created_at   TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (debt_id) REFERENCES debts(id) ON DELETE CASCADE,
  INDEX idx_planned_debt (debt_id),
  INDEX idx_planned_date (planned_date)
);

-- ============================================================
-- SEED DATA – Usuario demo
-- ============================================================

INSERT INTO users (name, email, password_hash, currency) VALUES
  ('Miguel Demo', 'demo@fintrack.app', '$2b$12$5iKgRtm0bdvI5dJn695Lxufy9d0U46ZsQOV0ts7gaUE10b3NShX2K', 'USD');

SET @uid = LAST_INSERT_ID();

INSERT INTO transactions (user_id, category_id, type, amount, description, txn_date) VALUES
  (@uid,  1, 'income',  2800.00, 'Salario enero',          '2026-01-05'),
  (@uid,  2, 'income',   450.00, 'Proyecto freelance web',  '2026-01-12'),
  (@uid,  5, 'expense',  320.00, 'Supermercado enero',      '2026-01-08'),
  (@uid,  6, 'expense',   85.00, 'Gasolina',                '2026-01-10'),
  (@uid,  7, 'expense',  600.00, 'Alquiler',                '2026-01-01'),
  (@uid, 10, 'expense',   55.00, 'Netflix + Spotify',       '2026-01-15'),
  (@uid, 12, 'expense',   75.00, 'Agua + luz',              '2026-01-20'),
  (@uid,  1, 'income',  2800.00, 'Salario febrero',         '2026-02-05'),
  (@uid,  3, 'income',   180.00, 'Dividendos',              '2026-02-14'),
  (@uid,  5, 'expense',  295.00, 'Supermercado febrero',    '2026-02-07'),
  (@uid,  6, 'expense',   90.00, 'Transporte público',      '2026-02-12'),
  (@uid,  7, 'expense',  600.00, 'Alquiler',                '2026-02-01'),
  (@uid,  8, 'expense',  120.00, 'Médico',                  '2026-02-18'),
  (@uid,  9, 'expense',  200.00, 'Curso online',            '2026-02-22'),
  (@uid,  1, 'income',  2800.00, 'Salario marzo',           '2026-03-05'),
  (@uid,  2, 'income',   600.00, 'Proyecto freelance app',  '2026-03-10'),
  (@uid,  5, 'expense',  310.00, 'Supermercado marzo',      '2026-03-06'),
  (@uid,  6, 'expense',   80.00, 'Gasolina',                '2026-03-11'),
  (@uid,  7, 'expense',  600.00, 'Alquiler',                '2026-03-01'),
  (@uid, 11, 'expense',  150.00, 'Ropa nueva',              '2026-03-14'),
  (@uid, 10, 'expense',   55.00, 'Suscripciones',           '2026-03-15');

INSERT INTO debts (user_id, name, initial_balance, current_balance, annual_rate, monthly_payment, payment_day, start_date, notes) VALUES
  (@uid, 'Tarjeta de crédito Visa',  5000.00, 3250.40, 0.2400, 250.00, 1, '2025-06-01', 'Banco Agrícola'),
  (@uid, 'Préstamo personal',       10000.00, 7842.15, 0.1800, 320.00, 1, '2025-03-01', 'Cooperativa');

SET @debt1 = (SELECT id FROM debts WHERE user_id = @uid AND name = 'Tarjeta de crédito Visa');
SET @debt2 = (SELECT id FROM debts WHERE user_id = @uid AND name = 'Préstamo personal');

INSERT INTO debt_payments (debt_id, payment_date, total_amount, principal_paid, interest_paid, extra_principal, balance_after) VALUES
  (@debt1, '2025-07-01', 250.00, 150.00, 100.00,   0.00, 4850.00),
  (@debt1, '2025-08-01', 250.00, 153.00,  97.00,   0.00, 4697.00),
  (@debt1, '2025-09-01', 250.00, 156.06,  93.94,   0.00, 4540.94),
  (@debt1, '2026-01-01', 750.00, 168.00,  82.00, 500.00, 3872.94),
  (@debt1, '2026-02-01', 250.00, 172.00,  78.00,   0.00, 3700.94),
  (@debt1, '2026-03-01', 250.00, 175.54,  74.46,   0.00, 3525.40),
  (@debt2, '2025-04-01', 320.00, 170.00, 150.00,   0.00, 9830.00),
  (@debt2, '2025-05-01', 320.00, 172.55, 147.45,   0.00, 9657.45),
  (@debt2, '2026-01-01', 820.00, 177.00, 143.00, 500.00, 8342.45),
  (@debt2, '2026-02-01', 320.00, 179.65, 140.35,   0.00, 8162.80),
  (@debt2, '2026-03-01', 320.00, 182.33, 137.67,   0.00, 7980.47);

INSERT INTO savings_goals (user_id, name, target_amount, current_amount, deadline, icon, color) VALUES
  (@uid, 'Fondo de emergencia', 5000.00, 2150.00, '2026-09-30', 'shield', '#22c55e'),
  (@uid, 'Viaje a Europa',      3000.00,  780.00, '2026-12-31', 'plane',  '#3b82f6'),
  (@uid, 'Laptop nueva',        1200.00, 1050.00, '2026-04-30', 'laptop', '#f59e0b');

SET @goal1 = (SELECT id FROM savings_goals WHERE user_id = @uid AND name = 'Fondo de emergencia');
SET @goal2 = (SELECT id FROM savings_goals WHERE user_id = @uid AND name = 'Viaje a Europa');
SET @goal3 = (SELECT id FROM savings_goals WHERE user_id = @uid AND name = 'Laptop nueva');

INSERT INTO savings_contributions (goal_id, amount, contrib_date, notes) VALUES
  (@goal1, 500.00, '2026-01-10', 'Ahorro enero'),
  (@goal1, 650.00, '2026-02-08', 'Ahorro febrero'),
  (@goal1, 500.00, '2026-03-10', 'Ahorro marzo'),
  (@goal2, 300.00, '2026-01-20', 'Primer aporte viaje'),
  (@goal2, 250.00, '2026-02-20', 'Aporte febrero'),
  (@goal2, 230.00, '2026-03-18', 'Aporte marzo'),
  (@goal3, 400.00, '2026-01-05', 'Aporte inicial'),
  (@goal3, 350.00, '2026-02-05', 'Aporte 2'),
  (@goal3, 300.00, '2026-03-05', 'Aporte 3');
