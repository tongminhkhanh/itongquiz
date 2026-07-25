ALTER TABLE ai_generation_actions
ADD COLUMN image_calls INTEGER NOT NULL DEFAULT 0 CHECK(image_calls >= 0);
