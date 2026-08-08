-- Preserve the plain text question/explanation columns for search, AI and legacy clients.
-- Rich content is a validated, JSON-serialised document owned by the API.
ALTER TABLE questions ADD COLUMN question_content_json TEXT;
ALTER TABLE questions ADD COLUMN explanation_content_json TEXT;

