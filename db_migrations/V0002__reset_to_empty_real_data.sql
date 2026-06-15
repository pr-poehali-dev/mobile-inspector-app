-- Сбрасываем все демо-данные в пустые значения.
-- При следующем запуске приложение запишет реальные данные.
INSERT INTO app_kv (key, value, updated_at) VALUES
  ('users',                '[]'::jsonb, NOW()),
  ('roleRequests',         '[]'::jsonb, NOW()),
  ('roleGrants',           '[]'::jsonb, NOW()),
  ('notifications',        '[]'::jsonb, NOW()),
  ('paymentServices',      '[]'::jsonb, NOW()),
  ('supportMessages',      '[]'::jsonb, NOW()),
  ('blockedContent',       '[]'::jsonb, NOW()),
  ('categories',           '{}'::jsonb, NOW()),
  ('schools_list',         '[]'::jsonb, NOW()),
  ('published_courses_all','[]'::jsonb, NOW()),
  ('school_enrollments_all','[]'::jsonb, NOW()),
  ('marketplace_executors','[]'::jsonb, NOW()),
  ('rfp_chats',            '[]'::jsonb, NOW()),
  ('rfp_interests',        '[]'::jsonb, NOW()),
  ('manager_appeals',      '[]'::jsonb, NOW()),
  ('doc_payment_requests', '[]'::jsonb, NOW()),
  ('referral_codes',       '[{"code":"PARTNER10","active":true}]'::jsonb, NOW()),
  ('totalVisits',          '0'::jsonb, NOW()),
  ('school_courses_1',     '[]'::jsonb, NOW()),
  ('test_ping',            'null'::jsonb, NOW())
ON CONFLICT (key) DO UPDATE
  SET value = EXCLUDED.value,
      updated_at = NOW();