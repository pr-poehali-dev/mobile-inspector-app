-- Добавляем ключи для новых персональных/общих данных
INSERT INTO app_kv (key, value, updated_at) VALUES
  ('checklist_spheres', '[]'::jsonb, NOW()),
  ('news_blog_profiles', '{}'::jsonb, NOW())
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW();