-- backend/src/database/migrations/003_referral_and_metrics.sql

-- Enums
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'referral_status') THEN
        CREATE TYPE referral_status AS ENUM ('PENDING', 'COMPLETED', 'REWARDED', 'CANCELLED');
    END IF;
END $$;

-- Add referral columns to users
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'referral_code') THEN
        ALTER TABLE users ADD COLUMN referral_code VARCHAR(8) UNIQUE;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'referred_by_id') THEN
        ALTER TABLE users ADD COLUMN referred_by_id UUID REFERENCES users(id) ON DELETE SET NULL;
    END IF;
END $$;

-- Referrals table
CREATE TABLE IF NOT EXISTS referrals (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    referrer_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    referred_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    status referral_status DEFAULT 'PENDING',
    reward_amount DECIMAL(15, 2),
    reward_tx_hash VARCHAR(64),
    converted_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT unique_referral UNIQUE (referred_id)
);

CREATE INDEX IF NOT EXISTS idx_referrals_referrer_id ON referrals(referrer_id);
CREATE INDEX IF NOT EXISTS idx_referrals_referred_id ON referrals(referred_id);
CREATE INDEX IF NOT EXISTS idx_referrals_status ON referrals(status);

-- Auth Metrics table
CREATE TABLE IF NOT EXISTS auth_metrics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    auth_method VARCHAR(20) DEFAULT 'stellar',
    success BOOLEAN NOT NULL,
    duration INTEGER NOT NULL,
    ip_address VARCHAR(45),
    user_agent TEXT,
    error_message TEXT,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_auth_metrics_timestamp ON auth_metrics(timestamp);
CREATE INDEX IF NOT EXISTS idx_auth_metrics_method ON auth_metrics(auth_method);
CREATE INDEX IF NOT EXISTS idx_auth_metrics_success ON auth_metrics(success);

-- Supported Currencies table
CREATE TABLE IF NOT EXISTS supported_currencies (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code VARCHAR(10) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    anchor_url TEXT,
    stellar_asset_code VARCHAR(12),
    stellar_asset_issuer VARCHAR(56),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_supported_currencies_code ON supported_currencies(code);

-- Update triggers
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_referrals_modtime') THEN
        CREATE TRIGGER update_referrals_modtime BEFORE UPDATE ON referrals FOR EACH ROW EXECUTE FUNCTION update_modified_column();
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_supported_currencies_modtime') THEN
        CREATE TRIGGER update_supported_currencies_modtime BEFORE UPDATE ON supported_currencies FOR EACH ROW EXECUTE FUNCTION update_modified_column();
    END IF;
END $$;
