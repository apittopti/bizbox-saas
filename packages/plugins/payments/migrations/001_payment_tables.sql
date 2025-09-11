-- Payment tables for BizBox Payments Plugin
-- This migration creates tables for managing Stripe payments, subscriptions, and connected accounts

-- Connected Accounts table for Stripe Connect
CREATE TABLE IF NOT EXISTS connected_accounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    stripe_account_id VARCHAR(255) NOT NULL UNIQUE,
    is_active BOOLEAN DEFAULT FALSE,
    onboarding_complete BOOLEAN DEFAULT FALSE,
    charges_enabled BOOLEAN DEFAULT FALSE,
    payouts_enabled BOOLEAN DEFAULT FALSE,
    requirements TEXT[] DEFAULT '{}',
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Platform Subscriptions table
CREATE TABLE IF NOT EXISTS platform_subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    plan_id VARCHAR(255) NOT NULL,
    status VARCHAR(50) NOT NULL CHECK (status IN ('active', 'past_due', 'canceled', 'incomplete')),
    current_period_start TIMESTAMP WITH TIME ZONE NOT NULL,
    current_period_end TIMESTAMP WITH TIME ZONE NOT NULL,
    stripe_subscription_id VARCHAR(255) NOT NULL UNIQUE,
    stripe_customer_id VARCHAR(255) NOT NULL,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Payment Intents table (general payments)
CREATE TABLE IF NOT EXISTS payment_intents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    customer_id UUID,
    amount INTEGER NOT NULL CHECK (amount > 0),
    currency VARCHAR(3) DEFAULT 'GBP',
    status VARCHAR(50) NOT NULL CHECK (status IN ('pending', 'processing', 'succeeded', 'failed', 'cancelled', 'refunded', 'partially_refunded')),
    payment_method_id VARCHAR(255),
    stripe_payment_intent_id VARCHAR(255) NOT NULL UNIQUE,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Booking Payments table (specific to booking payments)
CREATE TABLE IF NOT EXISTS booking_payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    booking_id UUID NOT NULL,
    customer_id UUID NOT NULL,
    amount INTEGER NOT NULL CHECK (amount > 0),
    deposit_amount INTEGER,
    payment_type VARCHAR(50) NOT NULL CHECK (payment_type IN ('deposit', 'full_payment', 'remaining_balance')),
    status VARCHAR(50) NOT NULL CHECK (status IN ('pending', 'processing', 'succeeded', 'failed', 'cancelled', 'refunded', 'partially_refunded')),
    stripe_payment_intent_id VARCHAR(255) NOT NULL UNIQUE,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Refunds table
CREATE TABLE IF NOT EXISTS refunds (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    payment_intent_id UUID,
    booking_payment_id UUID,
    stripe_refund_id VARCHAR(255) NOT NULL UNIQUE,
    amount INTEGER NOT NULL CHECK (amount > 0),
    reason VARCHAR(50) CHECK (reason IN ('duplicate', 'fraudulent', 'requested_by_customer')),
    status VARCHAR(50) NOT NULL CHECK (status IN ('pending', 'succeeded', 'failed', 'canceled')),
    initiated_by VARCHAR(50) NOT NULL CHECK (initiated_by IN ('platform', 'tenant')),
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    FOREIGN KEY (payment_intent_id) REFERENCES payment_intents(id) ON DELETE CASCADE,
    FOREIGN KEY (booking_payment_id) REFERENCES booking_payments(id) ON DELETE CASCADE,
    CHECK ((payment_intent_id IS NOT NULL AND booking_payment_id IS NULL) OR 
           (payment_intent_id IS NULL AND booking_payment_id IS NOT NULL))
);

-- Payment Events table (for webhook tracking)
CREATE TABLE IF NOT EXISTS payment_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    event_type VARCHAR(100) NOT NULL,
    stripe_event_id VARCHAR(255) UNIQUE,
    payment_intent_id UUID,
    booking_payment_id UUID,
    subscription_id UUID,
    event_data JSONB NOT NULL,
    processed BOOLEAN DEFAULT FALSE,
    webhook_triggered BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    FOREIGN KEY (payment_intent_id) REFERENCES payment_intents(id) ON DELETE CASCADE,
    FOREIGN KEY (booking_payment_id) REFERENCES booking_payments(id) ON DELETE CASCADE,
    FOREIGN KEY (subscription_id) REFERENCES platform_subscriptions(id) ON DELETE CASCADE
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_connected_accounts_tenant_id ON connected_accounts(tenant_id);
CREATE INDEX IF NOT EXISTS idx_connected_accounts_stripe_account_id ON connected_accounts(stripe_account_id);

CREATE INDEX IF NOT EXISTS idx_platform_subscriptions_tenant_id ON platform_subscriptions(tenant_id);
CREATE INDEX IF NOT EXISTS idx_platform_subscriptions_status ON platform_subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_platform_subscriptions_stripe_subscription_id ON platform_subscriptions(stripe_subscription_id);

CREATE INDEX IF NOT EXISTS idx_payment_intents_tenant_id ON payment_intents(tenant_id);
CREATE INDEX IF NOT EXISTS idx_payment_intents_status ON payment_intents(status);
CREATE INDEX IF NOT EXISTS idx_payment_intents_stripe_payment_intent_id ON payment_intents(stripe_payment_intent_id);
CREATE INDEX IF NOT EXISTS idx_payment_intents_created_at ON payment_intents(created_at);

CREATE INDEX IF NOT EXISTS idx_booking_payments_tenant_id ON booking_payments(tenant_id);
CREATE INDEX IF NOT EXISTS idx_booking_payments_booking_id ON booking_payments(booking_id);
CREATE INDEX IF NOT EXISTS idx_booking_payments_customer_id ON booking_payments(customer_id);
CREATE INDEX IF NOT EXISTS idx_booking_payments_status ON booking_payments(status);
CREATE INDEX IF NOT EXISTS idx_booking_payments_payment_type ON booking_payments(payment_type);
CREATE INDEX IF NOT EXISTS idx_booking_payments_created_at ON booking_payments(created_at);

CREATE INDEX IF NOT EXISTS idx_refunds_tenant_id ON refunds(tenant_id);
CREATE INDEX IF NOT EXISTS idx_refunds_payment_intent_id ON refunds(payment_intent_id);
CREATE INDEX IF NOT EXISTS idx_refunds_booking_payment_id ON refunds(booking_payment_id);
CREATE INDEX IF NOT EXISTS idx_refunds_status ON refunds(status);

CREATE INDEX IF NOT EXISTS idx_payment_events_tenant_id ON payment_events(tenant_id);
CREATE INDEX IF NOT EXISTS idx_payment_events_event_type ON payment_events(event_type);
CREATE INDEX IF NOT EXISTS idx_payment_events_processed ON payment_events(processed);
CREATE INDEX IF NOT EXISTS idx_payment_events_created_at ON payment_events(created_at);

-- Row Level Security (RLS) policies
ALTER TABLE connected_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE platform_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_intents ENABLE ROW LEVEL SECURITY;
ALTER TABLE booking_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE refunds ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_events ENABLE ROW LEVEL SECURITY;

-- RLS Policies for tenant isolation
CREATE POLICY tenant_isolation_connected_accounts ON connected_accounts
    USING (tenant_id = current_setting('app.current_tenant')::uuid);

CREATE POLICY tenant_isolation_platform_subscriptions ON platform_subscriptions
    USING (tenant_id = current_setting('app.current_tenant')::uuid);

CREATE POLICY tenant_isolation_payment_intents ON payment_intents
    USING (tenant_id = current_setting('app.current_tenant')::uuid);

CREATE POLICY tenant_isolation_booking_payments ON booking_payments
    USING (tenant_id = current_setting('app.current_tenant')::uuid);

CREATE POLICY tenant_isolation_refunds ON refunds
    USING (tenant_id = current_setting('app.current_tenant')::uuid);

CREATE POLICY tenant_isolation_payment_events ON payment_events
    USING (tenant_id = current_setting('app.current_tenant')::uuid);

-- Triggers for updated_at timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_connected_accounts_updated_at BEFORE UPDATE ON connected_accounts
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_platform_subscriptions_updated_at BEFORE UPDATE ON platform_subscriptions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_payment_intents_updated_at BEFORE UPDATE ON payment_intents
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_booking_payments_updated_at BEFORE UPDATE ON booking_payments
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_refunds_updated_at BEFORE UPDATE ON refunds
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();