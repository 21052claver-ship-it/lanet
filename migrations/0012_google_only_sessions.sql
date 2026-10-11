-- Existing sessions lack evidence of their sign-in provider. Require Google again.
-- Account IDs, roles, content, preferences and balances are preserved.
ALTER TABLE sessions ADD COLUMN auth_provider TEXT NOT NULL DEFAULT 'legacy'
  CHECK(auth_provider IN ('legacy', 'google'));
