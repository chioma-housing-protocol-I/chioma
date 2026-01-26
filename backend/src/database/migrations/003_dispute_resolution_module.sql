-- Migration: Dispute Resolution Module
-- Updates disputes table structure and adds missing tables

-- First, drop existing constraints and columns that need to be changed
DO $$
BEGIN
  -- Drop existing dispute_evidence table if it exists with old structure
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'dispute_evidence') THEN
    DROP TABLE IF EXISTS dispute_evidence CASCADE;
  END IF;
  
  -- Drop dispute_comments if it exists (shouldn't, but just in case)
  DROP TABLE IF EXISTS dispute_comments CASCADE;
END $$;

-- Update disputes table structure to match requirements
-- Note: Using UUID to match existing schema (rent_agreements.id and users.id are UUID)
DO $$
BEGIN
  -- Add dispute_id column if it doesn't exist (VARCHAR(36) for UUID string)
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                WHERE table_name = 'disputes' AND column_name = 'dispute_id') THEN
    ALTER TABLE disputes ADD COLUMN dispute_id VARCHAR(36);
  END IF;
  
  -- Update dispute_id to be unique and not null
  IF EXISTS (SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'disputes' AND column_name = 'dispute_id') THEN
    -- Generate UUIDs for existing rows if any
    UPDATE disputes 
    SET dispute_id = uuid_generate_v4()::text 
    WHERE dispute_id IS NULL;
    
    -- Drop existing constraint if it exists
    ALTER TABLE disputes DROP CONSTRAINT IF EXISTS disputes_dispute_id_unique;
    
    ALTER TABLE disputes 
      ALTER COLUMN dispute_id SET NOT NULL,
      ADD CONSTRAINT disputes_dispute_id_unique UNIQUE (dispute_id);
  END IF;
  
  -- Ensure agreement_id exists and is UUID (matching rent_agreements.id)
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                WHERE table_name = 'disputes' AND column_name = 'agreement_id') THEN
    ALTER TABLE disputes ADD COLUMN agreement_id UUID REFERENCES rent_agreements(id) ON DELETE CASCADE;
  END IF;
  
  -- Ensure agreement_id is NOT NULL
  ALTER TABLE disputes ALTER COLUMN agreement_id SET NOT NULL;
  
  -- Update initiated_by to UUID (matching users.id)
  IF EXISTS (SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'disputes' AND column_name = 'initiator_id') THEN
    -- If initiator_id exists, we can use it, but we also need initiated_by
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                  WHERE table_name = 'disputes' AND column_name = 'initiated_by') THEN
      ALTER TABLE disputes ADD COLUMN initiated_by UUID REFERENCES users(id) ON DELETE CASCADE;
      -- Copy data from initiator_id if it exists
      UPDATE disputes SET initiated_by = initiator_id WHERE initiated_by IS NULL;
    END IF;
  ELSIF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                    WHERE table_name = 'disputes' AND column_name = 'initiated_by') THEN
    ALTER TABLE disputes ADD COLUMN initiated_by UUID REFERENCES users(id) ON DELETE CASCADE;
  END IF;
  
  ALTER TABLE disputes ALTER COLUMN initiated_by SET NOT NULL;
  
  -- Add dispute_type if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                WHERE table_name = 'disputes' AND column_name = 'dispute_type') THEN
    ALTER TABLE disputes ADD COLUMN dispute_type VARCHAR(50);
  END IF;
  
  ALTER TABLE disputes ALTER COLUMN dispute_type SET NOT NULL;
  
  -- Add requested_amount if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                WHERE table_name = 'disputes' AND column_name = 'requested_amount') THEN
    ALTER TABLE disputes ADD COLUMN requested_amount DECIMAL(12,2);
  END IF;
  
  -- Add description if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                WHERE table_name = 'disputes' AND column_name = 'description') THEN
    ALTER TABLE disputes ADD COLUMN description TEXT;
  END IF;
  
  ALTER TABLE disputes ALTER COLUMN description SET NOT NULL;
  
  -- Update status column to match requirements (VARCHAR(20))
  IF EXISTS (SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'disputes' AND column_name = 'status') THEN
    ALTER TABLE disputes ALTER COLUMN status TYPE VARCHAR(20);
  ELSE
    ALTER TABLE disputes ADD COLUMN status VARCHAR(20) NOT NULL DEFAULT 'OPEN';
  END IF;
  
  -- Add resolution if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                WHERE table_name = 'disputes' AND column_name = 'resolution') THEN
    ALTER TABLE disputes ADD COLUMN resolution TEXT;
  END IF;
  
  -- Add resolved_by if it doesn't exist (UUID to match users.id)
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                WHERE table_name = 'disputes' AND column_name = 'resolved_by') THEN
    ALTER TABLE disputes ADD COLUMN resolved_by UUID REFERENCES users(id) ON DELETE SET NULL;
  END IF;
  
  -- Add resolved_at if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                WHERE table_name = 'disputes' AND column_name = 'resolved_at') THEN
    ALTER TABLE disputes ADD COLUMN resolved_at TIMESTAMP;
  END IF;
  
  -- Add metadata if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                WHERE table_name = 'disputes' AND column_name = 'metadata') THEN
    ALTER TABLE disputes ADD COLUMN metadata JSONB;
  END IF;
  
  -- Ensure created_at and updated_at exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                WHERE table_name = 'disputes' AND column_name = 'created_at') THEN
    ALTER TABLE disputes ADD COLUMN created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                WHERE table_name = 'disputes' AND column_name = 'updated_at') THEN
    ALTER TABLE disputes ADD COLUMN updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
  END IF;
END $$;

-- Create dispute_evidence table with correct structure
-- Using UUID for dispute_id and uploaded_by to match existing schema
CREATE TABLE IF NOT EXISTS dispute_evidence (
  id SERIAL PRIMARY KEY,
  dispute_id UUID NOT NULL REFERENCES disputes(id) ON DELETE CASCADE,
  uploaded_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  file_url TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_type VARCHAR(100) NOT NULL,
  file_size INTEGER NOT NULL,
  description TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Create dispute_comments table
-- Using UUID for dispute_id and user_id to match existing schema
CREATE TABLE IF NOT EXISTS dispute_comments (
  id SERIAL PRIMARY KEY,
  dispute_id UUID NOT NULL REFERENCES disputes(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  is_internal BOOLEAN DEFAULT false,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_disputes_agreement_id ON disputes(agreement_id);
CREATE INDEX IF NOT EXISTS idx_disputes_initiated_by ON disputes(initiated_by);
CREATE INDEX IF NOT EXISTS idx_disputes_status ON disputes(status);
CREATE INDEX IF NOT EXISTS idx_dispute_evidence_dispute_id ON dispute_evidence(dispute_id);
CREATE INDEX IF NOT EXISTS idx_dispute_comments_dispute_id ON dispute_comments(dispute_id);
