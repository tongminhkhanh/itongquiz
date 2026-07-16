-- One-time, idempotent bootstrap for a production database whose schema was
-- applied before Wrangler's d1_migrations registry was adopted.
-- Run only after audit_d1_migration_state.sql reports every migration as valid.

INSERT OR IGNORE INTO d1_migrations (name) VALUES
  ('0002_add_quiz_tags.sql'),
  ('0003_add_tags_to_questions.sql'),
  ('0004_add_perf_indexes.sql'),
  ('0005_add_gift_shop.sql'),
  ('0006_add_attendance_claims.sql'),
  ('0007_add_rag_tables.sql'),
  ('0008_add_system_settings.sql'),
  ('0009_extend_announcements.sql'),
  ('0010_add_analytics_json.sql'),
  ('0011_create_test_bank.sql'),
  ('0012_add_teacher_ai_daily_usage.sql'),
  ('0013_add_question_skill_metadata.sql'),
  ('0014_add_question_difficulty.sql'),
  ('0015_add_game_loop_tables.sql'),
  ('0016_add_live_exam_tables.sql'),
  ('0017_add_live_exam_waiting_room_chat.sql'),
  ('0018_add_live_exam_analytics.sql'),
  ('0019_add_phieu_nhanxet.sql'),
  ('0020_canonicalize_certificates.sql'),
  ('0021_certificate_template_layout.sql'),
  ('0022_default_certificate_name_font.sql'),
  ('0023_certificate_batch_text_overrides.sql'),
  ('0024_archive_classroom_records.sql'),
  ('0025_canonicalize_homework.sql'),
  ('0026_live_exam_hardening.sql');
