ALTER TABLE leave_requests ADD COLUMN pay_type TEXT CHECK(pay_type IN ('with-pay','without-pay'));
