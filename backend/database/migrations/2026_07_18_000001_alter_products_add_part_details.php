<?php

declare(strict_types=1);

use App\Core\Database\Migration;

// Adds the four part-classification fields the admin product form now captures
// separately from the generic key/value `product_specifications` table: a
// Genuine/Aftermarket/OEM classification (drives the storefront's color-coded
// quality badge), the OEM/part number, material, and country of origin.
class AlterProductsAddPartDetails extends Migration
{
    public function up(): void
    {
        $this->execute("ALTER TABLE products ADD COLUMN part_type ENUM('genuine','aftermarket','oem') NULL AFTER fits_all_vehicles;");
        $this->execute("ALTER TABLE products ADD COLUMN oem_part_number VARCHAR(150) NULL AFTER part_type;");
        $this->execute("ALTER TABLE products ADD COLUMN material VARCHAR(150) NULL AFTER oem_part_number;");
        $this->execute("ALTER TABLE products ADD COLUMN country_of_origin VARCHAR(150) NULL AFTER material;");
        $this->execute("ALTER TABLE products ADD INDEX idx_products_part_type (part_type);");
    }

    public function down(): void
    {
        $this->execute("ALTER TABLE products DROP INDEX idx_products_part_type;");
        $this->execute("ALTER TABLE products DROP COLUMN country_of_origin;");
        $this->execute("ALTER TABLE products DROP COLUMN material;");
        $this->execute("ALTER TABLE products DROP COLUMN oem_part_number;");
        $this->execute("ALTER TABLE products DROP COLUMN part_type;");
    }
}
