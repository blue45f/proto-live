-- =========================================================================
-- ProtoLive (프로토라이브) - Database Schema DDL (PostgreSQL)
--
-- 주의: 런타임은 현재 JSON 영속 store(apps/api/src/projects/projects.store.ts)를
-- 단일 진실원으로 사용한다. 이 DDL은 DB 이전 시점의 "계약"이며, 모델
-- (apps/api/src/projects/project.models.ts)을 반영해 현행화한 것이다. 실행은
-- DB 도입 시 ORM 마이그레이션으로 대체한다.
-- =========================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

DROP TABLE IF EXISTS audit_logs CASCADE;
DROP TABLE IF EXISTS project_reviews CASCADE;
DROP TABLE IF EXISTS project_log_entries CASCADE;
DROP TABLE IF EXISTS project_upvotes CASCADE;
DROP TABLE IF EXISTS project_events CASCADE;
DROP TABLE IF EXISTS match_proposals CASCADE;
DROP TABLE IF EXISTS projects CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- Users: 메이커/투자자/일반 회원/운영자
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    role VARCHAR(50) NOT NULL CHECK (role IN ('maker', 'investor', 'member', 'admin')),
    name VARCHAR(255),
    description TEXT,
    notes TEXT,
    password_hash VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Projects: 라이브 URL 검증을 통과한 프로토타입
-- maturity(성숙도)와 stack(빌드 유형)은 category(시장)와 직교하는 분류 축이다.
CREATE TABLE projects (
    id SERIAL PRIMARY KEY,
    user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    live_url VARCHAR(2048) NOT NULL,
    category VARCHAR(100) NOT NULL,
    maturity VARCHAR(50) NOT NULL DEFAULT 'building' CHECK (maturity IN ('early', 'building', 'live')),
    stack VARCHAR(50) CHECK (stack IN ('web', 'app', 'game', 'tools')),
    tags TEXT[] NOT NULL DEFAULT '{}',
    built_with TEXT[] NOT NULL DEFAULT '{}',
    custom_tools TEXT[] NOT NULL DEFAULT '{}',
    vibe_coded BOOLEAN NOT NULL DEFAULT FALSE,
    access_mode VARCHAR(50) NOT NULL DEFAULT 'screened' CHECK (access_mode IN ('screened', 'open')),
    protection_notice_accepted BOOLEAN NOT NULL DEFAULT FALSE,
    thumbnail VARCHAR(2048),
    featured BOOLEAN NOT NULL DEFAULT FALSE,
    final_url VARCHAR(2048),
    validation_success BOOLEAN NOT NULL DEFAULT FALSE,
    http_status INT,
    response_time_ms INT,
    validation_message TEXT,
    last_verified_at TIMESTAMP WITH TIME ZONE,
    investor_count INT NOT NULL DEFAULT 0,
    match_count INT NOT NULL DEFAULT 0,
    committed_amount_min BIGINT NOT NULL DEFAULT 0,
    committed_amount_max BIGINT NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Project Events: 관심 신호 텔레메트리. upvote는 별도 테이블이라 여기 포함하지 않는다.
CREATE TABLE project_events (
    id SERIAL PRIMARY KEY,
    project_id INT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    event_type VARCHAR(50) NOT NULL CHECK (event_type IN ('create', 'preview', 'outbound', 'match', 'refresh')),
    actor_email VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Project Upvotes: 1인 1표(회원당 프로젝트당 1표). 본인 프로젝트 추천은 애플리케이션에서 차단.
CREATE TABLE project_upvotes (
    id SERIAL PRIMARY KEY,
    project_id INT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    email VARCHAR(255) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (project_id, email)
);

-- Maker Log: 메이커 본인이 남기는 제작 과정 기록(공개 열람).
CREATE TABLE project_log_entries (
    id SERIAL PRIMARY KEY,
    project_id INT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    author_email VARCHAR(255) NOT NULL,
    body TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Project Reviews: 회원 평가/아이디어/성장지원 + 1단계 대댓글, 신고/모더레이션.
CREATE TABLE project_reviews (
    id SERIAL PRIMARY KEY,
    project_id INT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    parent_id INT REFERENCES project_reviews(id) ON DELETE CASCADE,
    author_email VARCHAR(255) NOT NULL,
    author_role VARCHAR(50) NOT NULL CHECK (author_role IN ('maker', 'investor', 'member')),
    type VARCHAR(50) NOT NULL CHECK (type IN ('review', 'support', 'idea')),
    rating SMALLINT CHECK (rating BETWEEN 1 AND 5),
    body TEXT NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'visible' CHECK (status IN ('visible', 'reported', 'hidden')),
    report_count INT NOT NULL DEFAULT 0,
    reported_by TEXT[] NOT NULL DEFAULT '{}',
    moderated_by VARCHAR(255),
    moderation_note TEXT,
    last_reported_at TIMESTAMP WITH TIME ZONE,
    last_moderated_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Match Proposals: 구조화된 투자 "의향"(비구속). 동의 기록 포함. 실제 자금 이동은 없다.
CREATE TABLE match_proposals (
    id SERIAL PRIMARY KEY,
    project_id INT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    investor_email VARCHAR(255),
    funding_range_id VARCHAR(100) NOT NULL,
    message TEXT NOT NULL,
    legal_notice_accepted BOOLEAN NOT NULL DEFAULT FALSE,
    privacy_consent_accepted BOOLEAN NOT NULL DEFAULT FALSE,
    risk_notice_accepted BOOLEAN NOT NULL DEFAULT FALSE,
    compliance_accepted_at TIMESTAMP WITH TIME ZONE,
    status VARCHAR(50) NOT NULL DEFAULT 'submitted' CHECK (status IN ('submitted', 'contacted', 'closed')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Audit Logs: 신고/자동숨김/운영처리/투자 관심 동의 감사 추적.
CREATE TABLE audit_logs (
    id SERIAL PRIMARY KEY,
    action VARCHAR(64) NOT NULL CHECK (action IN ('match_compliance_accepted', 'review_reported', 'review_hidden_auto', 'review_moderated')),
    actor_email VARCHAR(255) NOT NULL,
    target_type VARCHAR(50) NOT NULL CHECK (target_type IN ('project', 'review', 'match')),
    target_id INT NOT NULL,
    project_id INT REFERENCES projects(id) ON DELETE SET NULL,
    message TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for Optimized Queries
CREATE INDEX idx_projects_category ON projects(category);
CREATE INDEX idx_projects_maturity ON projects(maturity);
CREATE INDEX idx_projects_stack ON projects(stack);
CREATE INDEX idx_projects_user ON projects(user_id);
CREATE INDEX idx_projects_access_mode ON projects(access_mode);
CREATE INDEX idx_projects_featured ON projects(featured);
CREATE INDEX idx_projects_validation ON projects(validation_success, last_verified_at);
CREATE INDEX idx_match_proposals_project ON match_proposals(project_id);
CREATE INDEX idx_project_events_project_created ON project_events(project_id, created_at DESC);
CREATE INDEX idx_project_events_type ON project_events(event_type);
CREATE INDEX idx_project_upvotes_project ON project_upvotes(project_id);
CREATE INDEX idx_project_log_entries_project_created ON project_log_entries(project_id, created_at);
CREATE INDEX idx_project_reviews_project ON project_reviews(project_id);
CREATE INDEX idx_project_reviews_parent ON project_reviews(parent_id);
CREATE INDEX idx_audit_logs_created ON audit_logs(created_at DESC);
