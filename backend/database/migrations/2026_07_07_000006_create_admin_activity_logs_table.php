<?php

declare(strict_types=1);

use App\Core\Database\Migration;

// System-wide audit trail for admin-panel writes (product edited, order status
// changed, coupon created, settings updated, ...). admin_id is nullable + ON DELETE
// SET NULL so the audit record outlives the admin account that made the change.
class CreateAdminActivityLogsTable extends Migration
{
    public function up(): void
    {
        $this->execute("
            CREATE TABLE IF NOT EXISTS admin_activity_logs (
                id           BIGINT PRIMARY KEY AUTO_INCREMENT,
                admin_id     BIGINT NULL,
                action       VARCHAR(100) NOT NULL,
                entity_type  VARCHAR(50) NOT NULL,
                entity_id    BIGINT NULL,
                changes      JSON NULL,
                ip_address   VARCHAR(45) NULL,
                created_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                INDEX idx_admin_activity_logs_entity (entity_type, entity_id),
                INDEX idx_admin_activity_logs_admin_created (admin_id, created_at),
                CONSTRAINT fk_admin_activity_logs_admin FOREIGN KEY (admin_id) REFERENCES users(id) ON DELETE SET NULL
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
        ");
    }

    public function down(): void
    {
        $this->execute("DROP TABLE IF EXISTS admin_activity_logs;");
    }
}
