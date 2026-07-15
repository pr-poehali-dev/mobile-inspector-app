CREATE TABLE IF NOT EXISTS mi_videos (
    id BIGSERIAL PRIMARY KEY,
    author_id BIGINT NOT NULL,
    author_name VARCHAR(200) NOT NULL,
    author_avatar VARCHAR(20) NOT NULL DEFAULT '',
    title VARCHAR(300) NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    category VARCHAR(100) NOT NULL DEFAULT '',
    hashtags TEXT[] NOT NULL DEFAULT '{}',
    video_url TEXT NOT NULL DEFAULT '',
    banner_url TEXT NOT NULL DEFAULT '',
    thumbnail_gradient VARCHAR(200) NOT NULL DEFAULT '',
    views BIGINT NOT NULL DEFAULT 0,
    status VARCHAR(20) NOT NULL DEFAULT 'published',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS mi_video_likes (
    video_id BIGINT NOT NULL,
    user_id BIGINT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (video_id, user_id)
);

CREATE TABLE IF NOT EXISTS mi_video_favorites (
    video_id BIGINT NOT NULL,
    user_id BIGINT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (video_id, user_id)
);

CREATE TABLE IF NOT EXISTS mi_video_comments (
    id BIGSERIAL PRIMARY KEY,
    video_id BIGINT NOT NULL,
    user_id BIGINT NOT NULL,
    author_name VARCHAR(200) NOT NULL,
    text TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS mi_author_follows (
    follower_id BIGINT NOT NULL,
    author_id BIGINT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (follower_id, author_id)
);

CREATE INDEX IF NOT EXISTS idx_mi_videos_author ON mi_videos(author_id);
CREATE INDEX IF NOT EXISTS idx_mi_videos_status ON mi_videos(status);
CREATE INDEX IF NOT EXISTS idx_mi_video_comments_video ON mi_video_comments(video_id);
