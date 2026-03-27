-- Permite múltiples líneas de presupuesto por categoría por mes
-- name = '' → entrada sin nombre (retrocompatible)
-- name != '' → línea nombrada ("Préstamo banco", "Agua", etc.)

ALTER TABLE budgets
  ADD COLUMN name VARCHAR(100) NOT NULL DEFAULT '' AFTER category_id,
  DROP INDEX uq_budget_user_cat_month,
  ADD UNIQUE KEY uq_budget_line (user_id, category_id, month, name);
