CREATE TABLE IF NOT EXISTS ai_generation_stage_metrics (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  action_id TEXT NOT NULL,
  username TEXT NOT NULL,
  workflow TEXT NOT NULL,
  stage TEXT NOT NULL,
  model TEXT NOT NULL,
  status TEXT NOT NULL CHECK(status IN ('SUCCEEDED', 'FAILED')),
  request_bytes INTEGER NOT NULL DEFAULT 0 CHECK(request_bytes >= 0),
  ttfb_ms INTEGER CHECK(ttfb_ms IS NULL OR ttfb_ms >= 0),
  error_code TEXT,
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_ai_stage_metrics_action
ON ai_generation_stage_metrics(action_id, created_at);

CREATE INDEX IF NOT EXISTS idx_ai_stage_metrics_stage_date
ON ai_generation_stage_metrics(stage, created_at);
