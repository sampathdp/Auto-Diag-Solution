<?php

declare(strict_types=1);

use App\Core\Database\Migration;

class CreatePromoCodesTable extends Migration
{
    public function up(): void
    {
        // 1. Promo codes catalog — admin-managed, platform-wide (not tenant-scoped)
        $this->execute("CREATE TABLE IF NOT EXISTS promo_codes (
            id               BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
            code             VARCHAR(50) NOT NULL UNIQUE,
            discount_percent DECIMAL(5,2) NOT NULL,
            duration_months  INT UNSIGNED NULL COMMENT 'Billing months the discount applies for; NULL = applies forever',
            valid_from       DATETIME NULL COMMENT 'Code cannot be redeemed before this date',
            valid_until      DATETIME NULL COMMENT 'Code cannot be redeemed after this date',
            max_redemptions  INT UNSIGNED NULL COMMENT 'Max number of signups that may redeem this code; NULL = unlimited',
            times_redeemed   INT UNSIGNED NOT NULL DEFAULT 0,
            is_active        TINYINT(1) NOT NULL DEFAULT 1,
            created_by       BIGINT UNSIGNED NULL,
            created_at       DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updated_at       DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;");

        // 2. Track the code a trial applicant typed in at signup
        $this->execute("ALTER TABLE trial_requests
            ADD COLUMN promo_code VARCHAR(50) NULL AFTER plan_id;");

        // 3. Snapshot the redeemed discount onto the subscription so future promo_code edits
        //    never retroactively change what an already-signed-up salon is billed.
        $this->execute("ALTER TABLE subscriptions
            ADD COLUMN promo_code_id BIGINT UNSIGNED NULL AFTER plan_id,
            ADD COLUMN discount_percent DECIMAL(5,2) NULL AFTER promo_code_id,
            ADD COLUMN discount_expires_at DATETIME NULL AFTER discount_percent;");
    }

    public function down(): void
    {
        $this->execute("ALTER TABLE subscriptions
            DROP COLUMN promo_code_id,
            DROP COLUMN discount_percent,
            DROP COLUMN discount_expires_at;");

        $this->execute("ALTER TABLE trial_requests DROP COLUMN promo_code;");

        $this->execute("DROP TABLE IF EXISTS promo_codes;");
    }
}
