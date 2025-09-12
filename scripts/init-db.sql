-- BizBox Database Initialization Script
-- This script sets up the basic database structure

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Create basic schema
CREATE SCHEMA IF NOT EXISTS bizbox;

-- Set default search path
ALTER DATABASE bizbox_db SET search_path TO bizbox, public;

-- Create a simple health check table
CREATE TABLE IF NOT EXISTS bizbox.health_check (
    id SERIAL PRIMARY KEY,
    status TEXT DEFAULT 'ok',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insert initial health check record
INSERT INTO bizbox.health_check (status) VALUES ('initialized') ON CONFLICT DO NOTHING;

-- Success message
SELECT 'BizBox database initialized successfully' as message;