<?php

declare(strict_types=1);

use App\Core\Database\Migration;

class CreateVehiclesTable extends Migration
{
    public function up(): void
    {
        // The Year -> Make -> Model search drills down left-to-right, so the composite
        // (year, make, model) key below serves every step of that search as a leftmost-prefix
        // lookup (year alone, year+make, year+make+model) without needing separate indexes.
        $this->execute("
            CREATE TABLE IF NOT EXISTS vehicles (
                id         BIGINT PRIMARY KEY AUTO_INCREMENT,
                year       SMALLINT UNSIGNED NOT NULL,
                make       VARCHAR(100) NOT NULL,
                model      VARCHAR(150) NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                UNIQUE KEY uq_vehicles_year_make_model (year, make, model),
                INDEX idx_vehicles_make (make),
                INDEX idx_vehicles_model (model)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
        ");
    }

    public function down(): void
    {
        $this->execute("DROP TABLE IF EXISTS vehicles;");
    }
}
