-- =========================================================================
-- ProtoLive (프로토라이브) - Database Schema DDL (PostgreSQL)
-- =========================================================================

-- 1. Enable UUID Extension (Optional, but highly recommended for secure identifiers)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. Drop existing tables if they exist to start fresh
DROP TABLE IF EXISTS project_events CASCADE;
DROP TABLE IF EXISTS match_proposals CASCADE;
DROP TABLE IF EXISTS projects CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- 3. Create Users Table
-- role: 'maker' (registers prototypes) or 'investor' (views & matches with projects)
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    role VARCHAR(50) NOT NULL CHECK (role IN ('maker', 'investor')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 4. Create Projects Table
-- live_url must be verified as active (200 OK) before record insertion
CREATE TABLE projects (
    id SERIAL PRIMARY KEY,
    user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    live_url VARCHAR(2048) NOT NULL,
    category VARCHAR(100) NOT NULL,
    access_mode VARCHAR(50) NOT NULL DEFAULT 'screened' CHECK (access_mode IN ('screened', 'open')),
    protection_notice_accepted BOOLEAN NOT NULL DEFAULT FALSE,
    final_url VARCHAR(2048),
    validation_success BOOLEAN NOT NULL DEFAULT FALSE,
    http_status INT,
    response_time_ms INT,
    last_verified_at TIMESTAMP WITH TIME ZONE,
    investor_count INT NOT NULL DEFAULT 0,
    match_count INT NOT NULL DEFAULT 0,
    committed_amount_min BIGINT NOT NULL DEFAULT 0,
    committed_amount_max BIGINT NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 5. Create Project Events Table
-- Interaction telemetry powers attention ranking without exposing protected URLs.
CREATE TABLE project_events (
    id SERIAL PRIMARY KEY,
    project_id INT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    event_type VARCHAR(50) NOT NULL CHECK (event_type IN ('create', 'preview', 'outbound', 'match', 'refresh')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 6. Create Match Proposals Table
-- Investment intent is stored as structured data instead of a client-side simulation.
CREATE TABLE match_proposals (
    id SERIAL PRIMARY KEY,
    project_id INT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    funding_range_id VARCHAR(100) NOT NULL,
    message TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 7. Indexes for Optimized Queries
CREATE INDEX idx_projects_category ON projects(category);
CREATE INDEX idx_projects_user ON projects(user_id);
CREATE INDEX idx_projects_access_mode ON projects(access_mode);
CREATE INDEX idx_projects_validation ON projects(validation_success, last_verified_at);
CREATE INDEX idx_match_proposals_project ON match_proposals(project_id);
CREATE INDEX idx_project_events_project_created ON project_events(project_id, created_at DESC);
CREATE INDEX idx_project_events_type ON project_events(event_type);
