CREATE TABLE IF NOT EXISTS users (uid TEXT PRIMARY KEY, email TEXT, name TEXT, total_earned NUMERIC(14,2) NOT NULL DEFAULT 0, plan TEXT NOT NULL DEFAULT 'Free', kyc TEXT, created_at TIMESTAMPTZ NOT NULL DEFAULT now());
CREATE TABLE IF NOT EXISTS job_state (uid TEXT NOT NULL, job_id TEXT NOT NULL, applied_at BIGINT, day_idx INT NOT NULL DEFAULT -1, done JSONB NOT NULL DEFAULT '{}', stage JSONB NOT NULL DEFAULT '{}', active INT, active_at BIGINT, stage_at BIGINT, days_completed INT NOT NULL DEFAULT 0, paid NUMERIC(14,2) NOT NULL DEFAULT 0, history JSONB NOT NULL DEFAULT '[]', PRIMARY KEY (uid, job_id));
CREATE TABLE IF NOT EXISTS transactions (id TEXT PRIMARY KEY, uid TEXT NOT NULL, type TEXT NOT NULL, descr TEXT, amount NUMERIC(14,2) NOT NULL, status TEXT, ts BIGINT NOT NULL, dest TEXT, method TEXT, account TEXT);
CREATE INDEX IF NOT EXISTS tx_uid_ts ON transactions (uid, ts DESC);
CREATE TABLE IF NOT EXISTS requests (id TEXT PRIMARY KEY, uid TEXT NOT NULL, user_name TEXT, type TEXT NOT NULL, data JSONB NOT NULL, status TEXT NOT NULL DEFAULT 'pending', admin_message TEXT NOT NULL DEFAULT '', receipt JSONB, ts BIGINT NOT NULL, reviewed_ts BIGINT);
CREATE INDEX IF NOT EXISTS req_uid ON requests (uid, ts DESC);
CREATE INDEX IF NOT EXISTS req_type_status ON requests (type, status);
CREATE TABLE IF NOT EXISTS chats (uid TEXT PRIMARY KEY, messages JSONB NOT NULL DEFAULT '[]');
