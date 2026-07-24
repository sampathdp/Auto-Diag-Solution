<?php

declare(strict_types=1);

use App\Core\Database\Migration;

class AlterUsersAddIsGuest extends Migration
{
    public function up(): void
    {
        // Guest checkout auto-creates a lightweight users row (no password, no session)
        // so orders.user_id keeps working everywhere unchanged — this flag just lets the
        // admin customer list tell those apart from people who actually registered.
        $this->execute("ALTER TABLE users ADD COLUMN is_guest TINYINT(1) NOT NULL DEFAULT 0 AFTER role;");
        $this->execute("ALTER TABLE users ADD INDEX idx_users_is_guest (is_guest);");
    }

    public function down(): void
    {
        $this->execute("ALTER TABLE users DROP INDEX idx_users_is_guest;");
        $this->execute("ALTER TABLE users DROP COLUMN is_guest;");
    }
}
