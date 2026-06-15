-- Добавляем ключи для новых shared данных модулей
INSERT INTO app_kv (key, value, updated_at) VALUES
  ('videos_all',    '[]'::jsonb, NOW()),
  ('news_all',      '[]'::jsonb, NOW()),
  ('documents_all', '[]'::jsonb, NOW()),
  ('forum_topics',  '[]'::jsonb, NOW()),
  ('rfp_list',      '[]'::jsonb, NOW()),
  ('rfp_suppliers', '[]'::jsonb, NOW()),
  ('rfp_proposals', '[]'::jsonb, NOW())
ON CONFLICT (key) DO UPDATE
  SET value = EXCLUDED.value,
      updated_at = NOW();