-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. LINKS Table (Global Resource)
CREATE TABLE IF NOT EXISTS links (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    url TEXT UNIQUE NOT NULL,
    url_hash VARCHAR(32), -- MD5/SHA buffer for fast lookups
    domain VARCHAR(255),
    title TEXT,
    description TEXT,
    keywords TEXT, -- Comma separated or simple text
    media_type VARCHAR(50) DEFAULT 'html', -- html, pdf, image, etc.
    content_length BIGINT,
    http_status INTEGER,
    metadata_json JSONB, -- Full analysis results
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    last_scraped_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX IF NOT EXISTS idx_links_url_hash ON links(url_hash);
CREATE INDEX IF NOT EXISTS idx_links_domain ON links(domain);

-- 2. USERS Table (Simple for now, can expand later)
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(255) UNIQUE,
    email VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 3. USER_BOOKMARKS Table (The User's Collection)
CREATE TABLE IF NOT EXISTS user_bookmarks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    link_id UUID REFERENCES links(id) ON DELETE CASCADE,
    original_title TEXT, -- User's override title
    original_folder VARCHAR(255),
    is_favorite BOOLEAN DEFAULT FALSE,
    added_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- Ensure user can't have duplicate links (optional, but good practice)
    UNIQUE(user_id, link_id)
);

CREATE INDEX IF NOT EXISTS idx_user_bookmarks_user ON user_bookmarks(user_id);
