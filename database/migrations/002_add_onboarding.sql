ALTER TABLE users
  ADD COLUMN onboarding_completed TINYINT(1) NOT NULL DEFAULT 0 AFTER dark_mode;

-- Mark all existing users as already onboarded
UPDATE users SET onboarding_completed = 1;
