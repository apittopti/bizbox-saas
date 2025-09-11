-- UP
-- Create UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create tenants table (no RLS needed as it's the root table)
CREATE TABLE tenants (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  domain VARCHAR(255) UNIQUE,
  plan VARCHAR(50) NOT NULL DEFAULT 'basic',
  settings JSONB DEFAULT '{}',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Create users table with tenant isolation
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  email VARCHAR(255) NOT NULL,
  password_hash VARCHAR(255),
  role VARCHAR(50) NOT NULL DEFAULT 'user',
  profile JSONB DEFAULT '{}',
  permissions JSONB DEFAULT '[]',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(tenant_id, email)
);

-- Create businesses table with tenant isolation
CREATE TABLE businesses (
  tenant_id UUID PRIMARY KEY REFERENCES tenants(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  address JSONB,
  contact JSONB,
  branding JSONB DEFAULT '{}',
  social_media JSONB DEFAULT '{}',
  legal_documents JSONB DEFAULT '{}',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE businesses ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for users table
CREATE POLICY tenant_isolation_users ON users
  USING (tenant_id = current_setting('app.current_tenant', true)::uuid);

CREATE POLICY tenant_isolation_users_insert ON users
  FOR INSERT
  WITH CHECK (tenant_id = current_setting('app.current_tenant', true)::uuid);

-- Create RLS policies for businesses table
CREATE POLICY tenant_isolation_businesses ON businesses
  USING (tenant_id = current_setting('app.current_tenant', true)::uuid);

CREATE POLICY tenant_isolation_businesses_insert ON businesses
  FOR INSERT
  WITH CHECK (tenant_id = current_setting('app.current_tenant', true)::uuid);

-- Create indexes for performance
CREATE INDEX idx_users_tenant_id ON users(tenant_id);
CREATE INDEX idx_users_email ON users(tenant_id, email);
CREATE INDEX idx_businesses_tenant_id ON businesses(tenant_id);

-- Create function to automatically set updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at
CREATE TRIGGER update_tenants_updated_at BEFORE UPDATE ON tenants
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_businesses_updated_at BEFORE UPDATE ON businesses
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Create function to validate tenant context
CREATE OR REPLACE FUNCTION validate_tenant_context()
RETURNS TRIGGER AS $$
BEGIN
  IF current_setting('app.current_tenant', true) IS NULL OR 
     current_setting('app.current_tenant', true) = '' THEN
    RAISE EXCEPTION 'Tenant context must be set before accessing tenant-scoped data';
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$ language 'plpgsql';

-- Add tenant context validation triggers
CREATE TRIGGER validate_tenant_context_users
  BEFORE INSERT OR UPDATE OR DELETE ON users
  FOR EACH ROW EXECUTE FUNCTION validate_tenant_context();

CREATE TRIGGER validate_tenant_context_businesses
  BEFORE INSERT OR UPDATE OR DELETE ON businesses
  FOR EACH ROW EXECUTE FUNCTION validate_tenant_context();

-- DOWN
-- Drop triggers
DROP TRIGGER IF EXISTS validate_tenant_context_businesses ON businesses;
DROP TRIGGER IF EXISTS validate_tenant_context_users ON users;
DROP TRIGGER IF EXISTS update_businesses_updated_at ON businesses;
DROP TRIGGER IF EXISTS update_users_updated_at ON users;
DROP TRIGGER IF EXISTS update_tenants_updated_at ON tenants;

-- Drop functions
DROP FUNCTION IF EXISTS validate_tenant_context();
DROP FUNCTION IF EXISTS update_updated_at_column();

-- Drop indexes
DROP INDEX IF EXISTS idx_businesses_tenant_id;
DROP INDEX IF EXISTS idx_users_email;
DROP INDEX IF EXISTS idx_users_tenant_id;

-- Drop policies
DROP POLICY IF EXISTS tenant_isolation_businesses_insert ON businesses;
DROP POLICY IF EXISTS tenant_isolation_businesses ON businesses;
DROP POLICY IF EXISTS tenant_isolation_users_insert ON users;
DROP POLICY IF EXISTS tenant_isolation_users ON users;

-- Disable RLS
ALTER TABLE businesses DISABLE ROW LEVEL SECURITY;
ALTER TABLE users DISABLE ROW LEVEL SECURITY;

-- Drop tables
DROP TABLE IF EXISTS businesses;
DROP TABLE IF EXISTS users;
DROP TABLE IF EXISTS tenants;

-- Drop extension
DROP EXTENSION IF EXISTS "uuid-ossp";