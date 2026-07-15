<?php

declare(strict_types=1);

use App\Core\Database\Migration;

class CreateProductFitmentsTable extends Migration
{
    public function up(): void
    {
        // Freeform per-product fitment rows (year_from/year_to range + an optional VIN/option
        // note), replacing the old product_vehicle exact-year join — most parts fit a range of
        // model years, not one exact year, so a single row now covers e.g. 2018-2022 Camry
        // instead of five separate exact-year links.
        $this->execute("
            CREATE TABLE IF NOT EXISTS product_fitments (
                id         BIGINT PRIMARY KEY AUTO_INCREMENT,
                product_id BIGINT NOT NULL,
                make       VARCHAR(100) NOT NULL,
                model      VARCHAR(150) NOT NULL,
                year_from  SMALLINT UNSIGNED NOT NULL,
                year_to    SMALLINT UNSIGNED NOT NULL,
                vin_note   VARCHAR(255) NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                INDEX idx_product_fitments_product_id (product_id),
                INDEX idx_product_fitments_make_model_year (make, model, year_from, year_to),
                FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
        ");
    }

    public function down(): void
    {
        $this->execute("DROP TABLE IF EXISTS product_fitments;");
    }
}
