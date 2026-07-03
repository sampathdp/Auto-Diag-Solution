<?php

declare(strict_types=1);

use App\Core\Database\Migration;

class ImproveSubscriptionSystem extends Migration
{
    public function up(): void
    {
        // 1. Add billing_cycle to salon_payments (replaces fragile amount-guessing)
        $this->execute("ALTER TABLE salon_payments
            ADD COLUMN billing_cycle ENUM('monthly','yearly') NOT NULL DEFAULT 'monthly' AFTER plan_id,
            ADD COLUMN notes VARCHAR(500) NULL AFTER billing_cycle;");

        // 2. Add reminder tracking and expiry notification flags to subscriptions
        $this->execute("ALTER TABLE subscriptions
            ADD COLUMN reminder_7d_sent TINYINT(1) NOT NULL DEFAULT 0 AFTER expires_at,
            ADD COLUMN reminder_3d_sent TINYINT(1) NOT NULL DEFAULT 0 AFTER reminder_7d_sent,
            ADD COLUMN reminder_1d_sent TINYINT(1) NOT NULL DEFAULT 0 AFTER reminder_3d_sent,
            ADD COLUMN expiry_notified   TINYINT(1) NOT NULL DEFAULT 0 AFTER reminder_1d_sent;");

        // 3. Subscription audit log — every status change recorded
        $this->execute("CREATE TABLE IF NOT EXISTS subscription_audit_log (
            id            BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
            salon_id      BIGINT UNSIGNED NOT NULL,
            event_type    VARCHAR(50)  NOT NULL COMMENT 'approved|rejected|extended|expired|activated|plan_changed',
            old_status    VARCHAR(30)  NULL,
            new_status    VARCHAR(30)  NULL,
            old_expires_at DATETIME   NULL,
            new_expires_at DATETIME   NULL,
            plan_id       INT UNSIGNED NULL,
            billing_cycle VARCHAR(10) NULL,
            amount        DECIMAL(10,2) NULL,
            notes         TEXT NULL,
            created_by    BIGINT UNSIGNED NULL COMMENT 'admin user id, NULL for system actions',
            created_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;");

        // 4. System settings — admin-configurable platform-level config (bank details etc.)
        $this->execute("CREATE TABLE IF NOT EXISTS system_settings (
            id            INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
            setting_key   VARCHAR(100) NOT NULL UNIQUE,
            setting_value TEXT         NULL,
            updated_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;");

        // Seed default bank details so the UI works immediately
        $this->execute("INSERT INTO system_settings (setting_key, setting_value) VALUES
            ('bank_name',        'Commercial Bank of Ceylon'),
            ('bank_account_name','SalonFlow SaaS (PVT) Ltd'),
            ('bank_account_no',  '1000283920'),
            ('bank_branch',      'Colombo Fort Branch'),
            ('bank_instructions','Please transfer the exact subscription amount and upload the receipt immediately.')
            ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value);");
    }

    public function down(): void
    {
        $this->execute("ALTER TABLE salon_payments
            DROP COLUMN billing_cycle,
            DROP COLUMN notes;");

        $this->execute("ALTER TABLE subscriptions
            DROP COLUMN reminder_7d_sent,
            DROP COLUMN reminder_3d_sent,
            DROP COLUMN reminder_1d_sent,
            DROP COLUMN expiry_notified;");

        $this->execute("DROP TABLE IF EXISTS subscription_audit_log;");
        $this->execute("DROP TABLE IF EXISTS system_settings;");
    }
}
