<?php

declare(strict_types=1);

use App\Core\Database\Migration;

class CreateNotificationPreferencesTable extends Migration
{
    public function up(): void
    {
        $this->execute("
            CREATE TABLE IF NOT EXISTS notification_preferences (
                id                  BIGINT PRIMARY KEY AUTO_INCREMENT,
                user_id             BIGINT NOT NULL,
                email_orders        TINYINT(1) NOT NULL DEFAULT 1,
                email_promotions    TINYINT(1) NOT NULL DEFAULT 0,
                sms_orders          TINYINT(1) NOT NULL DEFAULT 1,
                sms_promotions      TINYINT(1) NOT NULL DEFAULT 0,
                whatsapp_updates    TINYINT(1) NOT NULL DEFAULT 0,
                push_notifications  TINYINT(1) NOT NULL DEFAULT 0,
                created_at          TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at          TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                UNIQUE KEY uq_notification_preferences_user_id (user_id),
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
        ");
    }

    public function down(): void
    {
        $this->execute("DROP TABLE IF EXISTS notification_preferences;");
    }
}
