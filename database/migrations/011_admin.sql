-- Admin flag for users
ALTER TABLE users
  ADD COLUMN is_admin TINYINT(1) NOT NULL DEFAULT 0;

-- To create an admin user, run:
-- UPDATE users SET is_admin = 1 WHERE email = 'your@email.com';
