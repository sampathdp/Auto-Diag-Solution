<?php

declare(strict_types=1);

use App\Core\Database\Migration;

class CreateShippingDistrictsTable extends Migration
{
    public function up(): void
    {
        // Admin-managed delivery zones — deliberately not tied to the fixed 7-emirate
        // enum on customer_addresses, since a single emirate (e.g. Dubai) can need
        // multiple rates for different areas. is_active gates whether a district is
        // still offered at checkout without losing its history on existing orders.
        $this->execute("
            CREATE TABLE IF NOT EXISTS shipping_districts (
                id         BIGINT PRIMARY KEY AUTO_INCREMENT,
                name       VARCHAR(150) NOT NULL,
                is_active  TINYINT(1) NOT NULL DEFAULT 1,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                UNIQUE KEY uq_shipping_districts_name (name)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
        ");
    }

    public function down(): void
    {
        $this->execute("DROP TABLE IF EXISTS shipping_districts;");
    }
}
