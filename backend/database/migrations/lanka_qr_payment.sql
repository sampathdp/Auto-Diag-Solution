-- LankaQR Payment System Schema

-- 1. Salon Payment Methods
CREATE TABLE IF NOT EXISTS salon_payment_methods (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    salon_id BIGINT NOT NULL,
    method_key ENUM('cash', 'lanka_qr', 'bank_transfer') NOT NULL,
    is_enabled BOOLEAN DEFAULT TRUE,
    qr_image VARCHAR(500),
    bank_name VARCHAR(255),
    account_number VARCHAR(100),
    account_name VARCHAR(255),
    branch_name VARCHAR(255),
    instructions TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_payment_methods_salon FOREIGN KEY (salon_id) REFERENCES salons(id) ON DELETE CASCADE
);

-- 2. Payment Proofs
CREATE TABLE IF NOT EXISTS payment_proofs (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    salon_id BIGINT NOT NULL,
    appointment_id BIGINT NOT NULL,
    proof_image VARCHAR(500) NOT NULL,
    amount DECIMAL(10,2) NOT NULL,
    status ENUM('pending', 'approved', 'rejected') DEFAULT 'pending',
    rejection_reason VARCHAR(255),
    verified_by BIGINT,
    verified_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_proofs_salon FOREIGN KEY (salon_id) REFERENCES salons(id) ON DELETE CASCADE,
    CONSTRAINT fk_proofs_appointment FOREIGN KEY (appointment_id) REFERENCES appointments(id) ON DELETE CASCADE
);

-- 3. Update Appointments table
ALTER TABLE appointments 
ADD COLUMN IF NOT EXISTS payment_method ENUM('cash', 'lanka_qr', 'bank_transfer') DEFAULT 'cash',
ADD COLUMN IF NOT EXISTS payment_status ENUM('unpaid', 'pending_verification', 'paid', 'partially_paid') DEFAULT 'unpaid';
