<?php

declare(strict_types=1);

use App\Core\Database\Migration;

class AddActualTimesToAppointments extends Migration
{
    public function up(): void
    {
        // actual_start_time / actual_end_time — recorded when staff checks in/out
        $this->execute("ALTER TABLE appointments
            ADD COLUMN IF NOT EXISTS actual_start_time DATETIME NULL AFTER end_time,
            ADD COLUMN IF NOT EXISTS actual_end_time   DATETIME NULL AFTER actual_start_time;");
    }

    public function down(): void
    {
        $this->execute("ALTER TABLE appointments
            DROP COLUMN IF EXISTS actual_start_time,
            DROP COLUMN IF EXISTS actual_end_time;");
    }
}
