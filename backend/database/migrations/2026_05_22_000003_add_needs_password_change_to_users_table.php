<?php

declare(strict_types=1);

use App\Core\Database\Migration;

class AddNeedsPasswordChangeToUsersTable extends Migration
{
    public function up(): void
    {
        $this->execute("ALTER TABLE users ADD COLUMN needs_password_change TINYINT(1) DEFAULT 0 AFTER is_active;");
    }

    public function down(): void
    {
        $this->execute("ALTER TABLE users DROP COLUMN needs_password_change;");
    }
}
