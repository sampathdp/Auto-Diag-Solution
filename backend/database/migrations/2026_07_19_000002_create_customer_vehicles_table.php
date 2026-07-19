<?php

declare(strict_types=1);

use App\Core\Database\Migration;

class CreateCustomerVehiclesTable extends Migration
{
    public function up(): void
    {
        // A customer's own garage (year/make/model + personalization) — distinct from the
        // admin-managed `vehicles` fitment catalog, which is a Year/Make/Model reference
        // table used to match products, not something a shopper owns or edits.
        $this->execute("
            CREATE TABLE IF NOT EXISTS customer_vehicles (
                id             BIGINT PRIMARY KEY AUTO_INCREMENT,
                user_id        BIGINT NOT NULL,
                year           INT NOT NULL,
                make           VARCHAR(100) NOT NULL,
                model          VARCHAR(100) NOT NULL,
                trim           VARCHAR(150) NULL,
                body_type      VARCHAR(100) NULL,
                engine         VARCHAR(100) NULL,
                fuel_type      VARCHAR(50) NULL,
                transmission   VARCHAR(50) NULL,
                drive_type     VARCHAR(50) NULL,
                color          VARCHAR(50) NULL,
                vin            VARCHAR(50) NULL,
                license_plate  VARCHAR(30) NULL,
                mileage        INT NULL,
                nickname       VARCHAR(100) NULL,
                purchase_date  DATE NULL,
                is_default     TINYINT(1) NOT NULL DEFAULT 0,
                created_at     TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at     TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                INDEX idx_customer_vehicles_user_id (user_id),
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
        ");
    }

    public function down(): void
    {
        $this->execute("DROP TABLE IF EXISTS customer_vehicles;");
    }
}
