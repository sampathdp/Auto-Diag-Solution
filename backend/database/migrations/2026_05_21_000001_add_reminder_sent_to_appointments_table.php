<?php

declare(strict_types=1);

use App\Core\Database\Migration;

class AddReminderSentToAppointmentsTable extends Migration
{
    public function up(): void
    {
        $this->execute("ALTER TABLE appointments ADD COLUMN reminder_sent TINYINT(1) DEFAULT 0 AFTER status;");
    }

    public function down(): void
    {
        $this->execute("ALTER TABLE appointments DROP COLUMN reminder_sent;");
    }
}
