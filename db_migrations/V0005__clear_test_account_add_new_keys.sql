-- Очищаем тестовый аккаунт и добавляем недостающие ключи для новых shared-модулей
UPDATE app_kv SET value = '[]'::jsonb, updated_at = NOW() WHERE key = 'mi_accounts_v1';

INSERT INTO app_kv (key, value, updated_at) VALUES
  ('support_tickets', '[]'::jsonb, NOW()),
  ('user_chats', '{}'::jsonb, NOW())
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW();