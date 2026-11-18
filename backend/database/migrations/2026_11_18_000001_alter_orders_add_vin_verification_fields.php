<?php

declare(strict_types=1);

use App\Core\Database\Migration;

// Splits the VIN gate into two explicit admin steps: first record the verified VIN
// (OrderService::verifyVin), then send to the 3PL (OrderService::approveForFulfillment),
// which now refuses to run until vin_verified_at is set.
class AlterOrdersAddVinVerificationFields extends Migration
{
    public function up(): void
    {
        $this->execute("
            ALTER TABLE orders
                ADD COLUMN vin             VARCHAR(17) NULL AFTER status,
                ADD COLUMN vin_verified_at TIMESTAMP NULL DEFAULT NULL AFTER vin,
                ADD COLUMN vin_verified_by BIGINT NULL AFTER vin_verified_at;
        ");
    }

    public function down(): void
    {
        $this->execute("
            ALTER TABLE orders
                DROP COLUMN vin,
                DROP COLUMN vin_verified_at,
                DROP COLUMN vin_verified_by;
        ");
    }
}
