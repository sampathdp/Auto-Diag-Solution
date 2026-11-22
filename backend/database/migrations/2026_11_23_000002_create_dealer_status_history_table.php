<?php

declare(strict_types=1);

use App\Core\Database\Migration;

// Append-only record of every dealer status change, who made it and why.
class CreateDealerStatusHistoryTable extends Migration
{
    public function up(): void
    {
        $this->execute("
            CREATE TABLE IF NOT EXISTS dealer_status_history (
                id                 BIGINT PRIMARY KEY AUTO_INCREMENT,
                dealer_profile_id  BIGINT NOT NULL,
                from_status        VARCHAR(30) NULL,
                to_status          VARCHAR(30) NOT NULL,
                reason             TEXT NULL,
                changed_by         BIGINT NULL,
                created_at         TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                INDEX idx_dealer_status_history_profile (dealer_profile_id, created_at),
                CONSTRAINT fk_dealer_status_history_profile FOREIGN KEY (dealer_profile_id) REFERENCES dealer_profiles(id) ON DELETE CASCADE,
                CONSTRAINT fk_dealer_status_history_user FOREIGN KEY (changed_by) REFERENCES users(id) ON DELETE SET NULL
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
        ");
    }

    public function down(): void
    {
        $this->execute("DROP TABLE IF EXISTS dealer_status_history;");
    }
}
