<?php

declare(strict_types=1);

use App\Core\Database\Migration;

class CreateProductVehicleTable extends Migration
{
    public function up(): void
    {
        // vehicle_id leads the unique key because the hot path is "customer picked a
        // Year/Make/Model, now list every compatible product" — a vehicle_id lookup.
        // The secondary index on product_id alone serves the reverse direction (a
        // product's admin-facing fitment list) without scanning the composite key.
        $this->execute("
            CREATE TABLE IF NOT EXISTS product_vehicle (
                id         BIGINT PRIMARY KEY AUTO_INCREMENT,
                product_id BIGINT NOT NULL,
                vehicle_id BIGINT NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                UNIQUE KEY uq_product_vehicle_vehicle_product (vehicle_id, product_id),
                INDEX idx_product_vehicle_product_id (product_id),
                FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
                FOREIGN KEY (vehicle_id) REFERENCES vehicles(id) ON DELETE CASCADE
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
        ");
    }

    public function down(): void
    {
        $this->execute("DROP TABLE IF EXISTS product_vehicle;");
    }
}
