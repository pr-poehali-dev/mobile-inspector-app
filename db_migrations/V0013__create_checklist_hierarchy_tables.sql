CREATE TABLE IF NOT EXISTS mi_checklist_spheres (
    id BIGSERIAL PRIMARY KEY,
    title VARCHAR(300) NOT NULL,
    icon VARCHAR(100) NOT NULL DEFAULT 'MoreHorizontal',
    color VARCHAR(20) NOT NULL DEFAULT '#64748b',
    sort_order INT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS mi_checklist_areas (
    id BIGSERIAL PRIMARY KEY,
    sphere_id BIGINT NOT NULL,
    title VARCHAR(300) NOT NULL,
    sort_order INT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS mi_checklist_defs (
    id BIGSERIAL PRIMARY KEY,
    area_id BIGINT NOT NULL,
    title VARCHAR(300) NOT NULL,
    sort_order INT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS mi_checklist_questions (
    id BIGSERIAL PRIMARY KEY,
    checklist_id BIGINT NOT NULL,
    text TEXT NOT NULL,
    requirement TEXT NOT NULL DEFAULT '',
    hint TEXT NOT NULL DEFAULT '',
    sort_order INT NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS mi_checklist_history (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL,
    object_name VARCHAR(300) NOT NULL DEFAULT '',
    checklist_title VARCHAR(300) NOT NULL DEFAULT '',
    sphere_title VARCHAR(300) NOT NULL DEFAULT '',
    area_title VARCHAR(300) NOT NULL DEFAULT '',
    yes_count INT NOT NULL DEFAULT 0,
    no_count INT NOT NULL DEFAULT 0,
    na_count INT NOT NULL DEFAULT 0,
    questions JSONB NOT NULL DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_mi_checklist_areas_sphere ON mi_checklist_areas(sphere_id);
CREATE INDEX IF NOT EXISTS idx_mi_checklist_defs_area ON mi_checklist_defs(area_id);
CREATE INDEX IF NOT EXISTS idx_mi_checklist_questions_cl ON mi_checklist_questions(checklist_id);
CREATE INDEX IF NOT EXISTS idx_mi_checklist_history_user ON mi_checklist_history(user_id);
