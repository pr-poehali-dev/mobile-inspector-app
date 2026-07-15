CREATE TABLE IF NOT EXISTS mi_news (
    id BIGSERIAL PRIMARY KEY,
    author_id BIGINT NOT NULL,
    author_name VARCHAR(200) NOT NULL,
    title VARCHAR(300) NOT NULL,
    text TEXT NOT NULL DEFAULT '',
    category VARCHAR(100) NOT NULL DEFAULT '',
    image_gradient VARCHAR(200) NOT NULL DEFAULT '',
    image_url TEXT NOT NULL DEFAULT '',
    important BOOLEAN NOT NULL DEFAULT false,
    status VARCHAR(20) NOT NULL DEFAULT 'published',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS mi_news_blog_profiles (
    user_id BIGINT PRIMARY KEY,
    banner_gradient VARCHAR(200) NOT NULL DEFAULT '',
    banner_url TEXT NOT NULL DEFAULT '',
    name VARCHAR(200) NOT NULL DEFAULT '',
    description TEXT NOT NULL DEFAULT '',
    location VARCHAR(200) NOT NULL DEFAULT ''
);

CREATE INDEX IF NOT EXISTS idx_mi_news_author ON mi_news(author_id);
CREATE INDEX IF NOT EXISTS idx_mi_news_status ON mi_news(status);
