CREATE TABLE IF NOT EXISTS mi_rfp (
    id BIGSERIAL PRIMARY KEY,
    owner_id BIGINT NOT NULL,
    title VARCHAR(300) NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    category VARCHAR(100) NOT NULL DEFAULT '',
    location VARCHAR(200) NOT NULL DEFAULT '',
    work_term VARCHAR(200) NOT NULL DEFAULT '',
    deadline VARCHAR(50) NOT NULL DEFAULT '',
    status VARCHAR(20) NOT NULL DEFAULT 'Черновик',
    contact_phone VARCHAR(30) NOT NULL DEFAULT '',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS mi_rfp_suppliers (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL UNIQUE,
    name VARCHAR(300) NOT NULL,
    about TEXT NOT NULL DEFAULT '',
    permit VARCHAR(300) NOT NULL DEFAULT '',
    location VARCHAR(200) NOT NULL DEFAULT '',
    contacts VARCHAR(300) NOT NULL DEFAULT '',
    site VARCHAR(300) NOT NULL DEFAULT '',
    completed_orders INT NOT NULL DEFAULT 0,
    verified BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS mi_rfp_proposals (
    id BIGSERIAL PRIMARY KEY,
    rfp_id BIGINT NOT NULL,
    supplier_id BIGINT NOT NULL,
    company VARCHAR(300) NOT NULL DEFAULT '',
    price NUMERIC(12,2) NOT NULL DEFAULT 0,
    delivery VARCHAR(200) NOT NULL DEFAULT '',
    delivery_days INT NOT NULL DEFAULT 0,
    file_url TEXT NOT NULL DEFAULT '',
    manual_rating INT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS mi_rfp_chats (
    id BIGSERIAL PRIMARY KEY,
    rfp_id BIGINT NOT NULL,
    supplier_id BIGINT NOT NULL,
    from_user_id BIGINT NOT NULL,
    text TEXT NOT NULL DEFAULT '',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS mi_rfp_interests (
    id BIGSERIAL PRIMARY KEY,
    supplier_id BIGINT NOT NULL,
    rfp_id BIGINT NOT NULL,
    rfp_title VARCHAR(300) NOT NULL DEFAULT '',
    from_name VARCHAR(200) NOT NULL DEFAULT '',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_mi_rfp_owner ON mi_rfp(owner_id);
CREATE INDEX IF NOT EXISTS idx_mi_rfp_proposals_rfp ON mi_rfp_proposals(rfp_id);
CREATE INDEX IF NOT EXISTS idx_mi_rfp_chats_rfp ON mi_rfp_chats(rfp_id, supplier_id);
CREATE INDEX IF NOT EXISTS idx_mi_rfp_interests_supplier ON mi_rfp_interests(supplier_id);
