<?php

declare(strict_types=1);

use App\Core\Database\Migration;

class CreateSmsBroadcastsTable extends Migration
{
    public function up(): void
    {
        $this->execute("CREATE TABLE IF NOT EXISTS sms_broadcasts (
            id              BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
            salon_id        BIGINT UNSIGNED NOT NULL,
            label           VARCHAR(120)  NOT NULL COMMENT 'Human-readable title e.g. \"Holiday Offer\"',
            message         TEXT          NOT NULL,
            total_recipients INT UNSIGNED NOT NULL DEFAULT 0,
            sent_count      INT UNSIGNED  NOT NULL DEFAULT 0,
            failed_count    INT UNSIGNED  NOT NULL DEFAULT 0,
            status          ENUM('sending','done','partial','failed') NOT NULL DEFAULT 'sending',
            created_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
            INDEX idx_salon (salon_id),
            INDEX idx_created (created_at)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;");
    }

    public function down(): void
    {
        $this->execute("DROP TABLE IF EXISTS sms_broadcasts;");
    }
}
