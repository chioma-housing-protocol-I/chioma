-- Add missing indexes to properties table
CREATE INDEX IF NOT EXISTS idx_properties_price ON properties(monthly_rent);
CREATE INDEX IF NOT EXISTS idx_properties_type ON properties(property_type);

-- Update rent_agreements table
ALTER TABLE rent_agreements 
  ALTER COLUMN payment_frequency SET DEFAULT 'monthly';

-- Update security_deposits table
ALTER TABLE security_deposits 
  RENAME COLUMN released_to TO deposit_release_to;
  
ALTER TABLE security_deposits 
  ALTER COLUMN deposit_release_to TYPE VARCHAR(20) 
  USING deposit_release_to::VARCHAR(20);

-- Update disputes table
ALTER TABLE disputes 
  RENAME COLUMN initiated_by TO dispute_initiated_by;
  
ALTER TABLE disputes 
  ALTER COLUMN dispute_initiated_by TYPE VARCHAR(20) 
  USING dispute_initiated_by::VARCHAR(20);

-- Add new tables
CREATE TABLE IF NOT EXISTS operation_records (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  transaction_id UUID NOT NULL REFERENCES indexed_transactions(id) ON DELETE CASCADE,
  operation_id VARCHAR(100) NOT NULL,
  type VARCHAR(50) NOT NULL,
  source_account VARCHAR(56) NOT NULL,
  amount DECIMAL(30, 7),
  asset_code VARCHAR(12),
  asset_issuer VARCHAR(56),
  from_account VARCHAR(56),
  to_account VARCHAR(56),
  data JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Add indexes for operation_records
CREATE INDEX IF NOT EXISTS idx_operation_records_tx_id ON operation_records(transaction_id);

-- Add indexer_state table
CREATE TABLE IF NOT EXISTS indexer_state (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  last_indexed_ledger BIGINT NOT NULL,
  last_indexed_at TIMESTAMP WITH TIME ZONE NOT NULL,
  indexer_version VARCHAR(20) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Insert initial state if not exists
INSERT INTO indexer_state (last_indexed_ledger, last_indexed_at, indexer_version)
SELECT 0, CURRENT_TIMESTAMP, '1.0.0'
WHERE NOT EXISTS (SELECT 1 FROM indexer_state);

-- Add missing indexes
CREATE INDEX IF NOT EXISTS idx_rent_agreements_escrow ON rent_agreements(escrow_account_pub_key);
CREATE INDEX IF NOT EXISTS idx_rent_payments_tx_hash ON rent_payments(transaction_hash);
CREATE INDEX IF NOT EXISTS idx_security_deposits_escrow ON security_deposits(escrow_account_pub_key);
CREATE INDEX IF NOT EXISTS idx_security_deposits_status ON security_deposits(status);
CREATE INDEX IF NOT EXISTS idx_disputes_status ON disputes(status);
CREATE INDEX IF NOT EXISTS idx_disputes_initiator ON disputes(initiator_id);
CREATE INDEX IF NOT EXISTS idx_indexed_tx_hash ON indexed_transactions(transaction_hash);
CREATE INDEX IF NOT EXISTS idx_indexed_tx_ledger ON indexed_transactions(ledger);
CREATE INDEX IF NOT EXISTS idx_indexed_tx_source ON indexed_transactions(source_account);
CREATE INDEX IF NOT EXISTS idx_indexed_tx_dest ON indexed_transactions(destination_account);
CREATE INDEX IF NOT EXISTS idx_indexed_tx_type ON indexed_transactions(transaction_type);
CREATE INDEX IF NOT EXISTS idx_indexed_tx_agreement ON indexed_transactions(agreement_id);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_webhook_deliveries_created_at ON webhook_deliveries(created_at DESC);

-- Add any other missing indexes from the updated schema
CREATE INDEX IF NOT EXISTS idx_rent_payments_due_date ON rent_payments(due_date);
CREATE INDEX IF NOT EXISTS idx_notifications_read ON notifications(read);

-- Update existing tables with any column changes
DO $$
BEGIN
  -- Add columns if they don't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                WHERE table_name = 'rent_agreements' AND column_name = 'renewal_notice_days') THEN
    ALTER TABLE rent_agreements ADD COLUMN renewal_notice_days INTEGER;
  END IF;
  
  -- Add any other missing columns or constraints here
  -- Example:
  -- IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
  --               WHERE table_name = 'table_name' AND column_name = 'column_name') THEN
  --   ALTER TABLE table_name ADD COLUMN column_name data_type;
  -- END IF;
  
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Error updating schema: %', SQLERRM;
END $$;

-- Add rent_obligation_nfts table
CREATE TABLE IF NOT EXISTS rent_obligation_nfts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  agreement_id UUID NOT NULL REFERENCES rent_agreements(id),
  obligation_id VARCHAR(255) NOT NULL,
  current_owner VARCHAR(56) NOT NULL,
  original_landlord VARCHAR(56) NOT NULL,
  mint_tx_hash VARCHAR(66) NOT NULL,
  minted_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  status VARCHAR(20) DEFAULT 'active',
  last_transfer_tx_hash VARCHAR(66),
  last_transferred_at TIMESTAMP WITH TIME ZONE,
  transfer_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_rent_obligation_nfts_agreement ON rent_obligation_nfts(agreement_id);
CREATE INDEX IF NOT EXISTS idx_rent_obligation_nfts_owner ON rent_obligation_nfts(current_owner);
