<?php

declare(strict_types=1);

use App\Core\Database\Migration;

class AddCommissionEnabledToStaff extends Migration
{
    public function up(): void
    {
        $this->execute("
            ALTER TABLE staff
            ADD COLUMN commission_enabled TINYINT(1) NOT NULL DEFAULT 1 AFTER commission_value
        ");
    }

    public function down(): void
    {
        $this->execute("ALTER TABLE staff DROP COLUMN commission_enabled");
    }
}
