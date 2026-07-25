<?php

declare(strict_types=1);

use App\Core\Database\Migration;

class CreateShippingRatesTable extends Migration
{
    public function up(): void
    {
        // One rate per district (UNIQUE district_id) — kept as its own table rather than
        // extra columns on shipping_districts so "define the district" and "price it" are
        // separate admin actions, and a district can exist unpriced (falls back to the
        // flat default in ShippingService) while it's being set up.
        $this->execute("
            CREATE TABLE IF NOT EXISTS shipping_rates (
                id                      BIGINT PRIMARY KEY AUTO_INCREMENT,
                district_id             BIGINT NOT NULL,
                rate                    DECIMAL(10,2) NOT NULL,
                free_shipping_threshold DECIMAL(10,2) NULL,
                created_at              TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at              TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                UNIQUE KEY uq_shipping_rates_district_id (district_id),
                FOREIGN KEY (district_id) REFERENCES shipping_districts(id) ON DELETE CASCADE
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
        ");
    }

    public function down(): void
    {
        $this->execute("DROP TABLE IF EXISTS shipping_rates;");
    }
}
