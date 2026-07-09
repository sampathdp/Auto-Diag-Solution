<?php

declare(strict_types=1);

use App\Core\Database\Migration;

class CreateCustomerAddressesTable extends Migration
{
    public function up(): void
    {
        $this->execute("
            CREATE TABLE IF NOT EXISTS customer_addresses (
                id             BIGINT PRIMARY KEY AUTO_INCREMENT,
                user_id        BIGINT NOT NULL,
                label          VARCHAR(100) NULL,
                full_name      VARCHAR(255) NOT NULL,
                phone          VARCHAR(30) NOT NULL,
                emirate        ENUM('Abu Dhabi','Dubai','Sharjah','Ajman','Umm Al Quwain','Ras Al Khaimah','Fujairah') NOT NULL DEFAULT 'Dubai',
                city           VARCHAR(100) NOT NULL DEFAULT 'Dubai',
                area           VARCHAR(150) NULL,
                street_address VARCHAR(255) NOT NULL,
                building       VARCHAR(150) NULL,
                apartment      VARCHAR(100) NULL,
                landmark       VARCHAR(255) NULL,
                postal_code    VARCHAR(20) NULL,
                is_default     TINYINT(1) NOT NULL DEFAULT 0,
                created_at     TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at     TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                INDEX idx_customer_addresses_user_id (user_id),
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
        ");
    }

    public function down(): void
    {
        $this->execute("DROP TABLE IF EXISTS customer_addresses;");
    }
}
