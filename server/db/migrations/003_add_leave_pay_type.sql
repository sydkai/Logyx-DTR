ALTER TABLE leave_requests
  ADD COLUMN IF NOT EXISTS pay_type TEXT CHECK (pay_type IN ('with-pay','without-pay'));
