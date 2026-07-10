ALTER TABLE rents ADD COLUMN payment_method TEXT CHECK (payment_method IN ('efectivo','transferencia'));
ALTER TABLE rents ADD COLUMN bank_reference TEXT;
ALTER TABLE rents ADD COLUMN maintenance REAL NOT NULL DEFAULT 0;
ALTER TABLE rents ADD COLUMN services_amount REAL NOT NULL DEFAULT 0;
ALTER TABLE rents ADD COLUMN other_charges REAL NOT NULL DEFAULT 0;
