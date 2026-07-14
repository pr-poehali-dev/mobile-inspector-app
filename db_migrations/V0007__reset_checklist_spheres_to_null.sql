-- Устанавливаем NULL, чтобы useSharedState сам инициализировал дефолтные значения при первой загрузке
UPDATE app_kv SET value = 'null'::jsonb, updated_at = NOW() WHERE key = 'checklist_spheres';