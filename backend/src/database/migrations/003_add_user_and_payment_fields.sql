-- Migration: 003_add_user_and_payment_fields.sql

-- Add missing fields to users table
ALTER TABLE users ADD COLUMN login_count INTEGER DEFAULT 0;
ALTER TABLE users ADD COLUMN preferred_language VARCHAR(10) DEFAULT 'en';
ALTER TABLE users ADD COLUMN timezone VARCHAR(50) DEFAULT 'UTC';
ALTER TABLE users ADD COLUMN two_factor_enabled BOOLEAN DEFAULT FALSE;
ALTER TABLE users ADD COLUMN email_notifications BOOLEAN DEFAULT TRUE;
ALTER TABLE users ADD COLUMN sms_notifications BOOLEAN DEFAULT FALSE;
ALTER TABLE users ADD COLUMN marketing_opt_in BOOLEAN DEFAULT FALSE;

-- Update payments table
-- Renaming colliding columns and adding new ones
ALTER TABLE payments RENAME COLUMN fee_amount TO transaction_fee;
ALTER TABLE payments ALTER COLUMN transaction_fee TYPE DECIMAL(18,2);

ALTER TABLE payments RENAME COLUMN payment_method TO payment_method_ref_id; -- Renaming relation FK if it was named payment_method
-- Wait, the entity used paymentMethodId as the column name for the FK.
-- Let's check the previous view_file for Payment entity.
-- Line 73: @Column({ nullable: true }) paymentMethodId: number;
-- Line 70: @ManyToOne(() => PaymentMethod, { nullable: true }) paymentMethod: PaymentMethod;
-- So the column name in DB for the relation is likely payment_method_id.

-- Let's adjust based on the entity modification I just made:
-- I renamed paymentMethodRelationId -> so I should rename the column in DB if it was payment_method_id.
-- But the user wants paymentMethod VARCHAR(50).

ALTER TABLE payments ADD COLUMN payment_method VARCHAR(50);
ALTER TABLE payments ADD COLUMN receipt_url VARCHAR(255);
ALTER TABLE payments ADD COLUMN refund_status VARCHAR(20) DEFAULT 'none';
ALTER TABLE payments RENAME COLUMN refunded_amount TO refund_amount;
ALTER TABLE payments ALTER COLUMN refund_amount TYPE DECIMAL(18,2);
-- refund_reason already exists as TEXT.

-- If we renamed the relation column:
-- ALTER TABLE payments RENAME COLUMN payment_method_id TO payment_method_relation_id;
