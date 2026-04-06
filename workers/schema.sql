-- iTongQuiz D1 Schema
-- Migrated from Google Sheets

-- Teachers
CREATE TABLE IF NOT EXISTS teachers (
  username TEXT PRIMARY KEY,
  password TEXT NOT NULL,
  full_name TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'teacher',
  class TEXT DEFAULT ''
);

-- Classes
CREATE TABLE IF NOT EXISTS classes (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  teacher_username TEXT NOT NULL,
  created_at TEXT NOT NULL
);

-- Students
CREATE TABLE IF NOT EXISTS students (
  id TEXT PRIMARY KEY,
  full_name TEXT NOT NULL,
  username TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  class_id TEXT NOT NULL,
  parent_phone TEXT DEFAULT '',
  avatar TEXT DEFAULT '',
  coins INTEGER DEFAULT 0,
  created_at TEXT NOT NULL
);

-- Quizzes
CREATE TABLE IF NOT EXISTS quizzes (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  class_level TEXT NOT NULL,
  category TEXT DEFAULT '',
  time_limit INTEGER DEFAULT 60,
  created_at TEXT NOT NULL,
  access_code TEXT DEFAULT '',
  require_code TEXT DEFAULT 'FALSE',
  created_by TEXT DEFAULT '',
  show_on_home TEXT DEFAULT 'TRUE',
  tags TEXT DEFAULT '[]'
);

-- Questions (flexible schema to handle 14+ question types)
CREATE TABLE IF NOT EXISTS questions (
  id TEXT PRIMARY KEY,
  quiz_id TEXT NOT NULL,
  type TEXT NOT NULL,
  question TEXT DEFAULT '',
  options TEXT DEFAULT '',
  correct_answer TEXT DEFAULT '',
  items TEXT DEFAULT '',
  text_field TEXT DEFAULT '',
  blanks TEXT DEFAULT '',
  distractors TEXT DEFAULT '',
  sentence TEXT DEFAULT '',
  words TEXT DEFAULT '',
  correct_word_indexes TEXT DEFAULT '',
  image TEXT DEFAULT '',
  tags TEXT DEFAULT ''
);

-- Results
CREATE TABLE IF NOT EXISTS results (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  student_name TEXT NOT NULL,
  class_name TEXT DEFAULT '',
  quiz_id TEXT DEFAULT '',
  quiz_title TEXT DEFAULT '',
  score REAL DEFAULT 0,
  correct_count INTEGER DEFAULT 0,
  total_questions INTEGER DEFAULT 0,
  time_taken INTEGER DEFAULT 0,
  submitted_at TEXT NOT NULL,
  answers TEXT DEFAULT '{}'
);

-- Assignments
CREATE TABLE IF NOT EXISTS assignments (
  id TEXT PRIMARY KEY,
  quiz_id TEXT NOT NULL,
  class_id TEXT NOT NULL,
  student_id TEXT DEFAULT '',
  deadline TEXT NOT NULL,
  max_attempts INTEGER DEFAULT 1,
  status TEXT DEFAULT 'OPEN',
  created_at TEXT NOT NULL
);

-- User Pets (Gamification)
CREATE TABLE IF NOT EXISTS user_pets (
  username TEXT PRIMARY KEY,
  pet_id TEXT DEFAULT 'cat_01',
  pet_name TEXT DEFAULT 'Mèo Con',
  level INTEGER DEFAULT 1,
  exp INTEGER DEFAULT 0,
  exp_to_next INTEGER DEFAULT 100,
  mood TEXT DEFAULT 'happy',
  items TEXT DEFAULT '[]',
  image_url TEXT DEFAULT '',
  last_active TEXT DEFAULT ''
);

-- Daily attendance claims (server-side anti-duplicate)
CREATE TABLE IF NOT EXISTS attendance_claims (
  id TEXT PRIMARY KEY,
  username TEXT NOT NULL,
  claim_date TEXT NOT NULL,
  reward_exp INTEGER NOT NULL,
  reward_coins INTEGER NOT NULL,
  created_at TEXT NOT NULL
);

-- Shop Items
CREATE TABLE IF NOT EXISTS shop_items (
  item_id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  price INTEGER DEFAULT 0,
  type TEXT DEFAULT 'ACCESSORY',
  category TEXT DEFAULT '',
  asset_url TEXT DEFAULT ''
);

-- Gift Shop Catalog (real-world reward catalog)
CREATE TABLE IF NOT EXISTS gift_catalog_items (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  price_coins INTEGER NOT NULL,
  image_url TEXT NOT NULL,
  is_active INTEGER DEFAULT 1,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

-- Gift Shop Orders
CREATE TABLE IF NOT EXISTS gift_orders (
  id TEXT PRIMARY KEY,
  idempotency_key TEXT UNIQUE NOT NULL,
  student_id TEXT NOT NULL,
  class_id TEXT NOT NULL,
  item_snapshot TEXT NOT NULL,
  price_coins INTEGER NOT NULL,
  status TEXT NOT NULL,
  voucher_code TEXT NOT NULL,
  delivered_by TEXT DEFAULT '',
  delivered_at TEXT DEFAULT '',
  cancel_reason TEXT DEFAULT '',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

-- Gift vouchers
CREATE TABLE IF NOT EXISTS gift_vouchers (
  code TEXT PRIMARY KEY,
  order_id TEXT UNIQUE NOT NULL,
  student_id TEXT NOT NULL,
  issued_at TEXT NOT NULL,
  status TEXT NOT NULL
);

-- Gift wallet ledger
CREATE TABLE IF NOT EXISTS gift_wallet_ledger (
  id TEXT PRIMARY KEY,
  student_id TEXT NOT NULL,
  delta_coins INTEGER NOT NULL,
  reason TEXT NOT NULL,
  ref_order_id TEXT DEFAULT '',
  created_at TEXT NOT NULL
);

-- Gift shop audit events
CREATE TABLE IF NOT EXISTS gift_order_events (
  id TEXT PRIMARY KEY,
  event_type TEXT NOT NULL,
  order_id TEXT DEFAULT '',
  student_id TEXT DEFAULT '',
  actor TEXT DEFAULT '',
  metadata TEXT DEFAULT '{}',
  created_at TEXT NOT NULL
);

-- Announcements
CREATE TABLE IF NOT EXISTS announcements (
  id TEXT PRIMARY KEY DEFAULT '1',
  content TEXT DEFAULT '',
  is_active TEXT DEFAULT 'false',
  updated_at TEXT DEFAULT ''
);

-- System settings (global toggles)
CREATE TABLE IF NOT EXISTS system_settings (
  setting_key TEXT PRIMARY KEY,
  setting_value TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

-- RAG documents metadata
CREATE TABLE IF NOT EXISTS rag_documents (
  id TEXT PRIMARY KEY,
  source_path TEXT UNIQUE NOT NULL,
  title TEXT NOT NULL,
  checksum TEXT NOT NULL,
  chunk_count INTEGER DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

-- RAG chunks (source of retrieval)
CREATE TABLE IF NOT EXISTS rag_chunks (
  id TEXT PRIMARY KEY,
  document_id TEXT NOT NULL,
  chunk_index INTEGER NOT NULL,
  section_title TEXT DEFAULT '',
  content TEXT NOT NULL,
  token_estimate INTEGER DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

-- RAG full-text search index
CREATE VIRTUAL TABLE IF NOT EXISTS rag_chunks_fts USING fts5(
  chunk_id UNINDEXED,
  source_path,
  title,
  section_title,
  content,
  tokenize = 'unicode61'
);

-- RAG query logs (anonymous)
CREATE TABLE IF NOT EXISTS rag_query_logs (
  id TEXT PRIMARY KEY,
  session_hash TEXT DEFAULT '',
  question TEXT NOT NULL,
  top_k INTEGER DEFAULT 6,
  retrieved_count INTEGER DEFAULT 0,
  confidence REAL DEFAULT 0,
  fallback_reason TEXT DEFAULT '',
  include_sources INTEGER DEFAULT 0,
  created_at TEXT NOT NULL
);

-- Performance indexes
CREATE INDEX IF NOT EXISTS idx_questions_quiz_id ON questions(quiz_id);
CREATE INDEX IF NOT EXISTS idx_students_class_id ON students(class_id);
CREATE INDEX IF NOT EXISTS idx_students_username ON students(username);
CREATE INDEX IF NOT EXISTS idx_assignments_class_id ON assignments(class_id);
CREATE INDEX IF NOT EXISTS idx_assignments_quiz_id ON assignments(quiz_id);
CREATE INDEX IF NOT EXISTS idx_results_quiz_id ON results(quiz_id);
CREATE INDEX IF NOT EXISTS idx_results_student ON results(student_name);
CREATE INDEX IF NOT EXISTS idx_classes_teacher ON classes(teacher_username);
CREATE INDEX IF NOT EXISTS idx_results_submitted_at ON results(submitted_at DESC);
CREATE UNIQUE INDEX IF NOT EXISTS idx_attendance_user_date ON attendance_claims(username, claim_date);
CREATE INDEX IF NOT EXISTS idx_attendance_user_week ON attendance_claims(username, claim_date DESC);
CREATE INDEX IF NOT EXISTS idx_gift_catalog_active ON gift_catalog_items(is_active);
CREATE INDEX IF NOT EXISTS idx_gift_orders_status ON gift_orders(status);
CREATE INDEX IF NOT EXISTS idx_gift_orders_student ON gift_orders(student_id);
CREATE INDEX IF NOT EXISTS idx_gift_orders_class ON gift_orders(class_id);
CREATE INDEX IF NOT EXISTS idx_gift_orders_updated_at ON gift_orders(updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_gift_vouchers_order ON gift_vouchers(order_id);
CREATE INDEX IF NOT EXISTS idx_gift_ledger_student ON gift_wallet_ledger(student_id);
CREATE INDEX IF NOT EXISTS idx_gift_events_created_at ON gift_order_events(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_rag_documents_source_path ON rag_documents(source_path);
CREATE INDEX IF NOT EXISTS idx_rag_chunks_document_id ON rag_chunks(document_id);
CREATE INDEX IF NOT EXISTS idx_rag_chunks_chunk_index ON rag_chunks(chunk_index);
CREATE INDEX IF NOT EXISTS idx_rag_logs_created_at ON rag_query_logs(created_at DESC);
