CREATE TABLE IF NOT EXISTS conversations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT NOT NULL,
  message_type TEXT NOT NULL,
  message_text TEXT NOT NULL,
  timestamp TEXT NOT NULL,
  raw_event TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_user_id ON conversations(user_id);
CREATE INDEX IF NOT EXISTS idx_timestamp ON conversations(timestamp);