<?php

declare(strict_types=1);

use App\Core\Database\Migration;

class AddStaffPermissionsToUsersTable extends Migration
{
    public function up(): void
    {
        $this->execute("ALTER TABLE users ADD COLUMN staff_permissions JSON NULL DEFAULT NULL AFTER needs_password_change;");
    }

    public function down(): void
    {
        $this->execute("ALTER TABLE users DROP COLUMN staff_permissions;");
    }
}
