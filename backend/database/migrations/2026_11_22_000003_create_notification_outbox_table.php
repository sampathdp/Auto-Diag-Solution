<?php

declare(strict_types=1);

use App\Core\Database\Migration;

// Every outgoing email is written here first, then delivered right after the HTTP
// response is sent (EmailOutbox) or, if that attempt fails, retried by the
// `notifications:dispatch` cron command. Business actions never wait for SMTP and a
// failed email never rolls one back.
// channel is an ENUM with a single value today (email only — no SMS by decision);
// further channels can be appended later without a table rebuild.
class CreateNotificationOutboxTable extends Migration
{
    public function up(): void
    {
        $this->execute("
            CREATE TABLE IF NOT EXISTS notification_outbox (
                id            BIGINT PRIMARY KEY AUTO_INCREMENT,
                channel       ENUM('email') NOT NULL DEFAULT 'email',
                recipient     VARCHAR(255) NOT NULL,
                subject       VARCHAR(255) NOT NULL,
                body_html     MEDIUMTEXT NOT NULL,
                body_text     MEDIUMTEXT NULL,
                template      VARCHAR(100) NULL,
                status        ENUM('pending','sending','sent','failed','skipped') NOT NULL DEFAULT 'pending',
                attempts      TINYINT UNSIGNED NOT NULL DEFAULT 0,
                last_error    TEXT NULL,
                available_at  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                locked_at     TIMESTAMP NULL,
                sent_at       TIMESTAMP NULL,
                created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                INDEX idx_notification_outbox_status_available (status, available_at),
                INDEX idx_notification_outbox_created (created_at)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
        ");
    }

    public function down(): void
    {
        $this->execute("DROP TABLE IF EXISTS notification_outbox;");
    }
}
