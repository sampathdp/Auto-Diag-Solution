<?php

declare(strict_types=1);

use App\Core\Database\Migration;

class CreateOrdersTable extends Migration
{
    public function up(): void
    {
        // shipping_snapshot preserves the delivery address exactly as it was at checkout —
        // customer_addresses rows can be edited/deleted later, but an order's paper trail must not change.
        // vat_rate is likewise a per-order snapshot since the admin-editable VAT setting can change over time.
        $this->execute("
            CREATE TABLE IF NOT EXISTS orders (
                id                   BIGINT PRIMARY KEY AUTO_INCREMENT,
                order_number         VARCHAR(50) NOT NULL,
                user_id              BIGINT NOT NULL,
                status               ENUM('pending','paid','processing','shipped','delivered','cancelled','refunded') NOT NULL DEFAULT 'pending',
                payment_status       ENUM('pending','paid','failed','refunded') NOT NULL DEFAULT 'pending',
                payment_method       VARCHAR(50) NULL DEFAULT 'stripe',
                payment_reference    VARCHAR(255) NULL,
                subtotal             DECIMAL(10,2) NOT NULL DEFAULT 0,
                vat_rate             DECIMAL(5,2) NOT NULL DEFAULT 5.00,
                vat_amount           DECIMAL(10,2) NOT NULL DEFAULT 0,
                shipping_amount      DECIMAL(10,2) NOT NULL DEFAULT 0,
                discount_amount      DECIMAL(10,2) NOT NULL DEFAULT 0,
                total                DECIMAL(10,2) NOT NULL DEFAULT 0,
                currency             VARCHAR(3) NOT NULL DEFAULT 'AED',
                shipping_address_id  BIGINT NULL,
                shipping_snapshot    JSON NOT NULL,
                notes                TEXT NULL,
                created_at           TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at           TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                UNIQUE KEY uq_orders_order_number (order_number),
                INDEX idx_orders_user_id_created_at (user_id, created_at),
                INDEX idx_orders_status (status),
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE RESTRICT,
                FOREIGN KEY (shipping_address_id) REFERENCES customer_addresses(id) ON DELETE SET NULL
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
        ");
    }

    public function down(): void
    {
        $this->execute("DROP TABLE IF EXISTS orders;");
    }
}
