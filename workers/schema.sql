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
  show_on_home TEXT DEFAULT 'TRUE'
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
  image TEXT DEFAULT ''
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

-- Shop Items
CREATE TABLE IF NOT EXISTS shop_items (
  item_id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  price INTEGER DEFAULT 0,
  type TEXT DEFAULT 'ACCESSORY',
  category TEXT DEFAULT '',
  asset_url TEXT DEFAULT ''
);

-- Announcements
CREATE TABLE IF NOT EXISTS announcements (
  id TEXT PRIMARY KEY DEFAULT '1',
  content TEXT DEFAULT '',
  is_active TEXT DEFAULT 'false',
  updated_at TEXT DEFAULT ''
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
