<?php

declare(strict_types=1);

use App\Core\Database\Migration;

// One row per approved dealer, created at approval. Phase 1 stores the terms set by
// the admin; outstanding_balance and reserved_amount are maintained by CreditService
// (Phase 5) inside the same transaction as each ledger entry, never edited by hand.
class CreateDealerCreditAccountsTable extends Migration
{
    public function up(): void
    {
        $this->execute("
            CREATE TABLE IF NOT EXISTS dealer_credit_accounts (
                dealer_profile_id    BIGINT PRIMARY KEY,
                credit_enabled       TINYINT(1) NOT NULL DEFAULT 0,
                credit_limit         DECIMAL(14,2) NOT NULL DEFAULT 0.00,
                credit_period_days   SMALLINT UNSIGNED NOT NULL DEFAULT 0,
                payment_terms        VARCHAR(255) NULL,
                outstanding_balance  DECIMAL(14,2) NOT NULL DEFAULT 0.00,
                reserved_amount      DECIMAL(14,2) NOT NULL DEFAULT 0.00,
                updated_by           BIGINT NULL,
                created_at           TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at           TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                CONSTRAINT fk_dealer_credit_accounts_profile FOREIGN KEY (dealer_profile_id) REFERENCES dealer_profiles(id) ON DELETE RESTRICT,
                CONSTRAINT fk_dealer_credit_accounts_updated_by FOREIGN KEY (updated_by) REFERENCES users(id) ON DELETE SET NULL
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
        ");
    }

    public function down(): void
    {
        $this->execute("DROP TABLE IF EXISTS dealer_credit_accounts;");
    }
}
