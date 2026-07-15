CREATE TABLE IF NOT EXISTS mi_forum_topics (
    id BIGSERIAL PRIMARY KEY,
    author_id BIGINT NOT NULL,
    author_name VARCHAR(200) NOT NULL,
    title VARCHAR(300) NOT NULL,
    section VARCHAR(100) NOT NULL DEFAULT 'Общее',
    pinned BOOLEAN NOT NULL DEFAULT false,
    has_file BOOLEAN NOT NULL DEFAULT false,
    file_url TEXT NOT NULL DEFAULT '',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS mi_forum_replies (
    id BIGSERIAL PRIMARY KEY,
    topic_id BIGINT NOT NULL,
    author_id BIGINT NOT NULL,
    author_name VARCHAR(200) NOT NULL,
    text TEXT NOT NULL DEFAULT '',
    file_url TEXT NOT NULL DEFAULT '',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_mi_forum_replies_topic ON mi_forum_replies(topic_id);
CREATE INDEX IF NOT EXISTS idx_mi_forum_topics_section ON mi_forum_topics(section);
