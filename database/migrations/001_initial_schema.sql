-- Migration: 001_initial_schema.sql
-- Multi-Tenant WhatsApp AI Auto-Reply System Schema

CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  full_name TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS whatsapp_sessions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  phone_number TEXT,
  status TEXT NOT NULL DEFAULT 'DISCONNECTED',
  connected_at DATETIME,
  last_seen_at DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_whatsapp_sessions_user_id ON whatsapp_sessions(user_id);

CREATE TABLE IF NOT EXISTS ai_settings (
  id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL UNIQUE,
  user_id TEXT NOT NULL,
  enabled INTEGER NOT NULL DEFAULT 1,
  system_prompt TEXT NOT NULL DEFAULT 'You are a helpful, professional customer support assistant. Reply politely and concisely. If you do not know the answer, politely ask them to wait for a human representative.',
  model TEXT NOT NULL DEFAULT 'gpt-4o-mini',
  reply_delay INTEGER NOT NULL DEFAULT 3,
  debounce_delay INTEGER NOT NULL DEFAULT 2,
  groups_enabled INTEGER NOT NULL DEFAULT 0,
  reply_only_when_mentioned INTEGER NOT NULL DEFAULT 0,
  business_hours_enabled INTEGER NOT NULL DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (session_id) REFERENCES whatsapp_sessions(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_ai_settings_user_id ON ai_settings(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_settings_session_id ON ai_settings(session_id);

CREATE TABLE IF NOT EXISTS contacts (
  id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  wa_jid TEXT NOT NULL,
  display_name TEXT,
  phone_number TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (session_id) REFERENCES whatsapp_sessions(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE(session_id, wa_jid)
);

CREATE INDEX IF NOT EXISTS idx_contacts_session_jid ON contacts(session_id, wa_jid);

CREATE TABLE IF NOT EXISTS contact_rules (
  id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  contact_id TEXT NOT NULL,
  ai_enabled INTEGER NOT NULL DEFAULT 1,
  blocked INTEGER NOT NULL DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (session_id) REFERENCES whatsapp_sessions(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (contact_id) REFERENCES contacts(id) ON DELETE CASCADE,
  UNIQUE(session_id, contact_id)
);

CREATE TABLE IF NOT EXISTS group_rules (
  id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  group_jid TEXT NOT NULL,
  ai_enabled INTEGER NOT NULL DEFAULT 0,
  reply_only_when_mentioned INTEGER NOT NULL DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (session_id) REFERENCES whatsapp_sessions(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE(session_id, group_jid)
);

CREATE TABLE IF NOT EXISTS business_hours (
  id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  day_of_week INTEGER NOT NULL, -- 0=Sunday, 1=Monday, ..., 6=Saturday
  enabled INTEGER NOT NULL DEFAULT 1,
  start_time TEXT NOT NULL DEFAULT '09:00',
  end_time TEXT NOT NULL DEFAULT '18:00',
  timezone TEXT NOT NULL DEFAULT 'UTC',
  outside_hours_action TEXT NOT NULL DEFAULT 'DO_NOTHING', -- 'DO_NOTHING' | 'SEND_CUSTOM_MESSAGE'
  outside_hours_message TEXT DEFAULT 'We are currently outside of our business hours. We will get back to you during working hours.',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (session_id) REFERENCES whatsapp_sessions(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE(session_id, day_of_week)
);

CREATE TABLE IF NOT EXISTS conversations (
  id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  contact_id TEXT,
  chat_jid TEXT NOT NULL,
  chat_name TEXT,
  is_group INTEGER NOT NULL DEFAULT 0,
  takeover_active INTEGER NOT NULL DEFAULT 0,
  takeover_until DATETIME,
  last_message_at DATETIME,
  last_message_preview TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (session_id) REFERENCES whatsapp_sessions(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE(session_id, chat_jid)
);

CREATE INDEX IF NOT EXISTS idx_conversations_user_session ON conversations(user_id, session_id);
CREATE INDEX IF NOT EXISTS idx_conversations_last_msg ON conversations(session_id, last_message_at);

CREATE TABLE IF NOT EXISTS messages (
  id TEXT PRIMARY KEY,
  conversation_id TEXT NOT NULL,
  session_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  wa_message_id TEXT NOT NULL,
  direction TEXT NOT NULL, -- 'INCOMING' | 'OUTGOING'
  sender TEXT NOT NULL,
  receiver TEXT NOT NULL,
  message_type TEXT NOT NULL DEFAULT 'text',
  text TEXT,
  is_from_me INTEGER NOT NULL DEFAULT 0,
  ai_generated INTEGER NOT NULL DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE,
  FOREIGN KEY (session_id) REFERENCES whatsapp_sessions(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE(session_id, wa_message_id)
);

CREATE INDEX IF NOT EXISTS idx_messages_conv ON messages(conversation_id, created_at);
CREATE INDEX IF NOT EXISTS idx_messages_wa_id ON messages(session_id, wa_message_id);
