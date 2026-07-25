<?php

declare(strict_types=1);

use App\Core\Database\Migration;

class AlterCustomerAddressesAddDistrictId extends Migration
{
    public function up(): void
    {
        // Nullable, ON DELETE SET NULL — an address with no district (or whose district
        // was later removed) just falls back to the flat shipping fee in ShippingService
        // rather than breaking checkout.
        $this->execute("
            ALTER TABLE customer_addresses
                ADD COLUMN district_id BIGINT NULL AFTER emirate,
                ADD INDEX idx_customer_addresses_district_id (district_id),
                ADD CONSTRAINT fk_customer_addresses_district FOREIGN KEY (district_id) REFERENCES shipping_districts(id) ON DELETE SET NULL;
        ");
    }

    public function down(): void
    {
        $this->execute("
            ALTER TABLE customer_addresses
                DROP FOREIGN KEY fk_customer_addresses_district,
                DROP INDEX idx_customer_addresses_district_id,
                DROP COLUMN district_id;
        ");
    }
}
