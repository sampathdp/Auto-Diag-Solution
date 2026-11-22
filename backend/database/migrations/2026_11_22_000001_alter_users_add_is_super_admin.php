<?php

declare(strict_types=1);

use App\Core\Database\Migration;

// Until now every admin bypassed every permission check. is_super_admin keeps that
// "can do everything" behaviour for the people who already had it (all current admins
// are backfilled to 1), while admins created from now on start with no special
// permissions and are granted specific ones through user_permissions.
class AlterUsersAddIsSuperAdmin extends Migration
{
    public function up(): void
    {
        $this->execute("ALTER TABLE users ADD COLUMN is_super_admin TINYINT(1) NOT NULL DEFAULT 0 AFTER role;");
        $this->execute("UPDATE users SET is_super_admin = 1 WHERE role = 'admin';");
    }

    public function down(): void
    {
        $this->execute("ALTER TABLE users DROP COLUMN is_super_admin;");
    }
}
