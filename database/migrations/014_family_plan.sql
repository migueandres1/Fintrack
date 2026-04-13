-- ============================================================
-- Migration 014 — Plan Familiar
-- Crea las tablas de grupos familiares y agrega family_id
-- a los recursos compartibles (cuentas, tarjetas, transacciones,
-- metas de ahorro).
--
-- Ejecutar en producción:  mysql -u user -p dbname < 014_family_plan.sql
-- ============================================================

-- ── Grupos familiares ─────────────────────────────────────────────────────
CREATE TABLE families (
  id         INT UNSIGNED    NOT NULL AUTO_INCREMENT,
  name       VARCHAR(120)    NOT NULL,
  owner_id   INT UNSIGNED    NOT NULL,
  created_at TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  CONSTRAINT fk_family_owner FOREIGN KEY (owner_id)
    REFERENCES users(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ── Miembros del grupo ────────────────────────────────────────────────────
CREATE TABLE family_members (
  id        INT UNSIGNED    NOT NULL AUTO_INCREMENT,
  family_id INT UNSIGNED    NOT NULL,
  user_id   INT UNSIGNED    NOT NULL,
  role      ENUM('owner','member') NOT NULL DEFAULT 'member',
  joined_at TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_family_user (family_id, user_id),
  CONSTRAINT fk_fm_family FOREIGN KEY (family_id)
    REFERENCES families(id) ON DELETE CASCADE,
  CONSTRAINT fk_fm_user FOREIGN KEY (user_id)
    REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ── Invitaciones ──────────────────────────────────────────────────────────
CREATE TABLE family_invitations (
  id         INT UNSIGNED    NOT NULL AUTO_INCREMENT,
  family_id  INT UNSIGNED    NOT NULL,
  email      VARCHAR(180)    NOT NULL,
  token      VARCHAR(64)     NOT NULL,
  invited_by INT UNSIGNED    NOT NULL,
  status     ENUM('pending','accepted','expired') NOT NULL DEFAULT 'pending',
  expires_at TIMESTAMP       NOT NULL,
  created_at TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_inv_token (token),
  CONSTRAINT fk_inv_family FOREIGN KEY (family_id)
    REFERENCES families(id) ON DELETE CASCADE,
  CONSTRAINT fk_inv_inviter FOREIGN KEY (invited_by)
    REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ── family_id en recursos compartibles ───────────────────────────────────

ALTER TABLE bank_accounts
  ADD COLUMN family_id INT UNSIGNED NULL AFTER user_id,
  ADD KEY    idx_ba_family (family_id),
  ADD CONSTRAINT fk_ba_family FOREIGN KEY (family_id)
    REFERENCES families(id) ON DELETE SET NULL;

ALTER TABLE credit_cards
  ADD COLUMN family_id INT UNSIGNED NULL AFTER user_id,
  ADD KEY    idx_cc_family (family_id),
  ADD CONSTRAINT fk_cc_family FOREIGN KEY (family_id)
    REFERENCES families(id) ON DELETE SET NULL;

ALTER TABLE transactions
  ADD COLUMN family_id INT UNSIGNED NULL AFTER user_id,
  ADD KEY    idx_txn_family (family_id),
  ADD CONSTRAINT fk_txn_family FOREIGN KEY (family_id)
    REFERENCES families(id) ON DELETE SET NULL;

ALTER TABLE savings_goals
  ADD COLUMN family_id INT UNSIGNED NULL AFTER user_id,
  ADD KEY    idx_sg_family (family_id),
  ADD CONSTRAINT fk_sg_family FOREIGN KEY (family_id)
    REFERENCES families(id) ON DELETE SET NULL;
