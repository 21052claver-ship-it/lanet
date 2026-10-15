-- Seek directly to a user's unread notices without scanning their read history.
-- Additive index only: no notification, account or academic data is changed.
CREATE INDEX agenda_notifications_unread
ON agenda_notifications(user_id,created_at DESC,id)
WHERE read_at IS NULL;
