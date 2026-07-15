CREATE TABLE IF NOT EXISTS mi_documents (
    id BIGSERIAL PRIMARY KEY,
    owner_id BIGINT NOT NULL,
    owner_name VARCHAR(200) NOT NULL,
    name VARCHAR(300) NOT NULL,
    category VARCHAR(100) NOT NULL DEFAULT '',
    doc_type VARCHAR(100) NOT NULL DEFAULT '',
    direction VARCHAR(100) NOT NULL DEFAULT '',
    dept VARCHAR(200) NOT NULL DEFAULT '',
    paid BOOLEAN NOT NULL DEFAULT false,
    price NUMERIC(10,2) NOT NULL DEFAULT 0,
    content TEXT NOT NULL DEFAULT '',
    pdf_url TEXT NOT NULL DEFAULT '',
    docx_url TEXT NOT NULL DEFAULT '',
    xlsx_url TEXT NOT NULL DEFAULT '',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS mi_doc_payment_requests (
    id BIGSERIAL PRIMARY KEY,
    doc_id BIGINT NOT NULL,
    doc_name VARCHAR(300) NOT NULL,
    price NUMERIC(10,2) NOT NULL DEFAULT 0,
    buyer_id BIGINT NOT NULL,
    buyer_name VARCHAR(200) NOT NULL,
    owner_id BIGINT NOT NULL,
    receipt_url TEXT NOT NULL DEFAULT '',
    status VARCHAR(20) NOT NULL DEFAULT 'pending',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS mi_doc_purchases (
    doc_id BIGINT NOT NULL,
    user_id BIGINT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (doc_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_mi_documents_owner ON mi_documents(owner_id);
CREATE INDEX IF NOT EXISTS idx_mi_doc_pay_buyer ON mi_doc_payment_requests(buyer_id);
CREATE INDEX IF NOT EXISTS idx_mi_doc_pay_owner ON mi_doc_payment_requests(owner_id);
