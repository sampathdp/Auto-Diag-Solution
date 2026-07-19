<?php

declare(strict_types=1);

use App\Core\Database\Migration;

class AlterCustomerAddressesAddInstructions extends Migration
{
    public function up(): void
    {
        $this->execute("ALTER TABLE customer_addresses ADD COLUMN delivery_instructions TEXT NULL AFTER landmark;");
    }

    public function down(): void
    {
        $this->execute("ALTER TABLE customer_addresses DROP COLUMN delivery_instructions;");
    }
}
