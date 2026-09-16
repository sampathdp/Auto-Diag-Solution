<?php

declare(strict_types=1);

use App\Core\Database\Migration;

// Sales reps referenced by promo codes/commissions — see CreatePromoCodesTable and
// CreateCommissionsTable for the tables that FK into this one.
class CreateSalesRepresentativesTable extends Migration
{
    public function up(): void
    {
        $this->execute("
            CREATE TABLE IF NOT EXISTS sales_representatives (
                id                BIGINT PRIMARY KEY AUTO_INCREMENT,
                name              VARCHAR(255) NOT NULL,
                phone             VARCHAR(30) NULL,
                email             VARCHAR(191) NOT NULL,
                address           VARCHAR(500) NULL,
                status            ENUM('active','inactive') NOT NULL DEFAULT 'active',
                commission_type   ENUM('percentage','fixed_amount') NOT NULL DEFAULT 'percentage',
                commission_value  DECIMAL(10,2) NOT NULL DEFAULT 0.00,
                created_at        TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at        TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                UNIQUE KEY uq_sales_representatives_email (email),
                INDEX idx_sales_representatives_status (status)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
        ");
    }

    public function down(): void
    {
        $this->execute("DROP TABLE IF EXISTS sales_representatives;");
    }
}
