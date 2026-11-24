<?php

declare(strict_types=1);

use App\Core\Database\Migration;

// One row per granted permission string (see App\Support\Permissions for the catalogue).
// Super admins (users.is_super_admin = 1) need no rows here: they implicitly hold '*'.
class CreateUserPermissionsTable extends Migration
{
    public function up(): void
    {
        $this->execute("
            CREATE TABLE IF NOT EXISTS user_permissions (
                id          BIGINT PRIMARY KEY AUTO_INCREMENT,
                user_id     BIGINT NOT NULL,
                permission  VARCHAR(100) NOT NULL,
                granted_by  BIGINT NULL,
                created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                UNIQUE KEY uq_user_permissions_user_perm (user_id, permission),
                CONSTRAINT fk_user_permissions_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
                CONSTRAINT fk_user_permissions_granted_by FOREIGN KEY (granted_by) REFERENCES users(id) ON DELETE SET NULL
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
        ");
    }

    public function down(): void
    {
        $this->execute("DROP TABLE IF EXISTS user_permissions;");
    }
}
