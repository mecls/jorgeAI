CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Users (skip if you already have one)
CREATE TABLE users (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email       text UNIQUE,
  created_at  timestamptz NOT NULL DEFAULT now()
);

-- One user has many conversations
CREATE TABLE conversations (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title       text, -- optional, e.g. "Travel planning"
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_conversations_user_updated
  ON conversations(user_id, updated_at DESC);

-- Messages in a conversation (user/assistant/system)
CREATE TABLE messages (
  id              bigserial PRIMARY KEY,
  conversation_id uuid NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  role            text NOT NULL CHECK (role IN ('user','assistant','system')),
  content         text NOT NULL,
  created_at      timestamptz NOT NULL DEFAULT now()
);

-- Fast pagination and ordered reads per conversation [web:156]
CREATE INDEX idx_messages_conversation_id_id
  ON messages(conversation_id, id);
