-- UP
-- Create audit_logs table for comprehensive audit logging
CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL,
  user_id UUID,
  action VARCHAR(100) NOT NULL,
  resource VARCHAR(100) NOT NULL,
  resource_id VARCHAR(255),
  old_values JSONB,
  new_values JSONB,
  metadata JSONB DEFAULT '{}',
  ip_address INET,
  user_agent TEXT,
  timestamp TIMESTAMP DEFAULT NOW()
);

-- Create indexes for audit_logs performance
CREATE INDEX IF NOT EXISTS idx_audit_logs_tenant_id ON audit_logs(tenant_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_resource ON audit_logs(resource);
CREATE INDEX IF NOT EXISTS idx_audit_logs_timestamp ON audit_logs(timestamp);
CREATE INDEX IF NOT EXISTS idx_audit_logs_resource_id ON audit_logs(resource_id);

-- Enable RLS on audit_logs
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for audit logs
CREATE POLICY tenant_isolation_audit_logs ON audit_logs
  USING (tenant_id = current_setting('app.current_tenant', true)::uuid);

CREATE POLICY tenant_isolation_audit_logs_insert ON audit_logs
  FOR INSERT
  WITH CHECK (tenant_id = current_setting('app.current_tenant', true)::uuid);

-- Add UK business registration fields to businesses table
ALTER TABLE businesses 
ADD COLUMN IF NOT EXISTS uk_business_registration JSONB DEFAULT '{}';

-- Update businesses table to ensure required fields have proper constraints
ALTER TABLE businesses 
ALTER COLUMN name SET NOT NULL,
ALTER COLUMN address SET NOT NULL,
ALTER COLUMN contact SET NOT NULL;

-- Add validation trigger for UK postcode format
CREATE OR REPLACE FUNCTION validate_uk_postcode()
RETURNS TRIGGER AS $
BEGIN
  IF NEW.address IS NOT NULL AND NEW.address->>'postcode' IS NOT NULL THEN
    IF NOT (NEW.address->>'postcode' ~ '^[A-Z]{1,2}[0-9R][0-9A-Z]? [0-9][A-Z]{2}$') THEN
      RAISE EXCEPTION 'Invalid UK postcode format: %', NEW.address->>'postcode';
    END IF;
  END IF;
  RETURN NEW;
END;
$ language 'plpgsql';

CREATE TRIGGER validate_business_postcode
  BEFORE INSERT OR UPDATE ON businesses
  FOR EACH ROW EXECUTE FUNCTION validate_uk_postcode();

-- Add validation trigger for UK phone numbers
CREATE OR REPLACE FUNCTION validate_uk_phone()
RETURNS TRIGGER AS $
BEGIN
  IF NEW.contact IS NOT NULL AND NEW.contact->>'phone' IS NOT NULL THEN
    IF NOT (NEW.contact->>'phone' ~ '^(\+44\s?7\d{3}|\(?07\d{3}\)?)\s?\d{3}\s?\d{3}$|^(\+44\s?1\d{3}|\(?01\d{3}\)?)\s?\d{3}\s?\d{3}$|^(\+44\s?20\s?|020\s?)\d{4}\s?\d{4}$') THEN
      RAISE EXCEPTION 'Invalid UK phone number format: %', NEW.contact->>'phone';
    END IF;
  END IF;
  RETURN NEW;
END;
$ language 'plpgsql';

CREATE TRIGGER validate_business_phone
  BEFORE INSERT OR UPDATE ON businesses
  FOR EACH ROW EXECUTE FUNCTION validate_uk_phone();

-- Add validation for user phone numbers
CREATE TRIGGER validate_user_phone
  BEFORE INSERT OR UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION validate_uk_phone_user();

CREATE OR REPLACE FUNCTION validate_uk_phone_user()
RETURNS TRIGGER AS $
BEGIN
  IF NEW.profile IS NOT NULL AND NEW.profile->>'phone' IS NOT NULL THEN
    IF NOT (NEW.profile->>'phone' ~ '^(\+44\s?7\d{3}|\(?07\d{3}\)?)\s?\d{3}\s?\d{3}$|^(\+44\s?1\d{3}|\(?01\d{3}\)?)\s?\d{3}\s?\d{3}$|^(\+44\s?20\s?|020\s?)\d{4}\s?\d{4}$') THEN
      RAISE EXCEPTION 'Invalid UK phone number format: %', NEW.profile->>'phone';
    END IF;
  END IF;
  RETURN NEW;
END;
$ language 'plpgsql';

-- Add comprehensive audit triggers for all tables
CREATE OR REPLACE FUNCTION audit_trigger_function()
RETURNS TRIGGER AS $
DECLARE
  tenant_id_val UUID;
  user_id_val UUID;
  action_val VARCHAR(10);
BEGIN
  -- Determine action
  IF TG_OP = 'INSERT' THEN
    action_val := 'CREATE';
  ELSIF TG_OP = 'UPDATE' THEN
    action_val := 'UPDATE';
  ELSIF TG_OP = 'DELETE' THEN
    action_val := 'DELETE';
  END IF;

  -- Get tenant_id from the record
  IF TG_OP = 'DELETE' THEN
    tenant_id_val := OLD.tenant_id;
  ELSE
    tenant_id_val := NEW.tenant_id;
  END IF;

  -- Get user_id from session if available
  BEGIN
    user_id_val := current_setting('app.current_user', true)::uuid;
  EXCEPTION WHEN OTHERS THEN
    user_id_val := NULL;
  END;

  -- Insert audit log
  INSERT INTO audit_logs (
    tenant_id, user_id, action, resource, resource_id,
    old_values, new_values, metadata
  ) VALUES (
    tenant_id_val,
    user_id_val,
    action_val,
    TG_TABLE_NAME,
    CASE 
      WHEN TG_OP = 'DELETE' THEN OLD.id::text
      ELSE NEW.id::text
    END,
    CASE WHEN TG_OP = 'DELETE' OR TG_OP = 'UPDATE' THEN row_to_json(OLD) ELSE NULL END,
    CASE WHEN TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN row_to_json(NEW) ELSE NULL END,
    json_build_object(
      'operation', TG_OP,
      'table', TG_TABLE_NAME,
      'timestamp', NOW()
    )
  );

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  ELSE
    RETURN NEW;
  END IF;
END;
$ language 'plpgsql';

-- Create audit triggers for all tenant-scoped tables
CREATE TRIGGER audit_users_trigger
  AFTER INSERT OR UPDATE OR DELETE ON users
  FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();

CREATE TRIGGER audit_businesses_trigger
  AFTER INSERT OR UPDATE OR DELETE ON businesses
  FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();

-- Special audit trigger for tenants (no tenant_id column)
CREATE OR REPLACE FUNCTION audit_tenants_trigger_function()
RETURNS TRIGGER AS $
DECLARE
  action_val VARCHAR(10);
BEGIN
  -- Determine action
  IF TG_OP = 'INSERT' THEN
    action_val := 'CREATE';
  ELSIF TG_OP = 'UPDATE' THEN
    action_val := 'UPDATE';
  ELSIF TG_OP = 'DELETE' THEN
    action_val := 'DELETE';
  END IF;

  -- Insert audit log (tenant operations are not tenant-scoped)
  INSERT INTO audit_logs (
    tenant_id, action, resource, resource_id,
    old_values, new_values, metadata
  ) VALUES (
    CASE 
      WHEN TG_OP = 'DELETE' THEN OLD.id
      ELSE NEW.id
    END,
    action_val,
    'tenants',
    CASE 
      WHEN TG_OP = 'DELETE' THEN OLD.id::text
      ELSE NEW.id::text
    END,
    CASE WHEN TG_OP = 'DELETE' OR TG_OP = 'UPDATE' THEN row_to_json(OLD) ELSE NULL END,
    CASE WHEN TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN row_to_json(NEW) ELSE NULL END,
    json_build_object(
      'operation', TG_OP,
      'table', 'tenants',
      'timestamp', NOW()
    )
  );

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  ELSE
    RETURN NEW;
  END IF;
END;
$ language 'plpgsql';

CREATE TRIGGER audit_tenants_trigger
  AFTER INSERT OR UPDATE OR DELETE ON tenants
  FOR EACH ROW EXECUTE FUNCTION audit_tenants_trigger_function();

-- Add performance indexes for common queries
CREATE INDEX IF NOT EXISTS idx_users_email_tenant ON users(tenant_id, email);
CREATE INDEX IF NOT EXISTS idx_users_role_tenant ON users(tenant_id, role);
CREATE INDEX IF NOT EXISTS idx_businesses_name ON businesses USING gin(to_tsvector('english', name));
CREATE INDEX IF NOT EXISTS idx_tenants_domain ON tenants(domain) WHERE domain IS NOT NULL;

-- Add constraint to ensure unique email per tenant
ALTER TABLE users DROP CONSTRAINT IF EXISTS unique_email_per_tenant;
ALTER TABLE users ADD CONSTRAINT unique_email_per_tenant UNIQUE (tenant_id, email);

-- Add constraint to ensure unique domain across tenants
ALTER TABLE tenants DROP CONSTRAINT IF EXISTS unique_domain;
ALTER TABLE tenants ADD CONSTRAINT unique_domain UNIQUE (domain);

-- DOWN
-- Drop audit triggers
DROP TRIGGER IF EXISTS audit_tenants_trigger ON tenants;
DROP TRIGGER IF EXISTS audit_businesses_trigger ON businesses;
DROP TRIGGER IF EXISTS audit_users_trigger ON users;

-- Drop audit functions
DROP FUNCTION IF EXISTS audit_tenants_trigger_function();
DROP FUNCTION IF EXISTS audit_trigger_function();

-- Drop validation triggers
DROP TRIGGER IF EXISTS validate_user_phone ON users;
DROP TRIGGER IF EXISTS validate_business_phone ON businesses;
DROP TRIGGER IF EXISTS validate_business_postcode ON businesses;

-- Drop validation functions
DROP FUNCTION IF EXISTS validate_uk_phone_user();
DROP FUNCTION IF EXISTS validate_uk_phone();
DROP FUNCTION IF EXISTS validate_uk_postcode();

-- Drop constraints
ALTER TABLE tenants DROP CONSTRAINT IF EXISTS unique_domain;
ALTER TABLE users DROP CONSTRAINT IF EXISTS unique_email_per_tenant;

-- Drop indexes
DROP INDEX IF EXISTS idx_tenants_domain;
DROP INDEX IF EXISTS idx_businesses_name;
DROP INDEX IF EXISTS idx_users_role_tenant;
DROP INDEX IF EXISTS idx_users_email_tenant;

-- Remove added columns
ALTER TABLE businesses DROP COLUMN IF EXISTS uk_business_registration;

-- Drop RLS policies for audit_logs
DROP POLICY IF EXISTS tenant_isolation_audit_logs_insert ON audit_logs;
DROP POLICY IF EXISTS tenant_isolation_audit_logs ON audit_logs;

-- Disable RLS on audit_logs
ALTER TABLE audit_logs DISABLE ROW LEVEL SECURITY;

-- Drop audit_logs indexes
DROP INDEX IF EXISTS idx_audit_logs_resource_id;
DROP INDEX IF EXISTS idx_audit_logs_timestamp;
DROP INDEX IF EXISTS idx_audit_logs_resource;
DROP INDEX IF EXISTS idx_audit_logs_action;
DROP INDEX IF EXISTS idx_audit_logs_user_id;
DROP INDEX IF EXISTS idx_audit_logs_tenant_id;

-- Drop audit_logs table
DROP TABLE IF EXISTS audit_logs;