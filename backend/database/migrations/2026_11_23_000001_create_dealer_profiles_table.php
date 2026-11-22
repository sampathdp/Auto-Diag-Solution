<?php

declare(strict_types=1);

use App\Core\Database\Migration;

// A dealer is an ordinary customer user plus one row here. Status is read from this
// table on every B2B request (never from the JWT), so a suspension takes effect at once.
//
// UAE fields: trade licence (instead of a BR copy), TRN (VAT Tax Registration Number,
// optional for businesses that aren't VAT-registered), Emirates ID or UAE driving licence
// for the owner, emirate (same values as customer_addresses.emirate).
// owner_id_number is stored encrypted (App\Core\Encryption); owner_id_last4 is kept in
// clear only so admins can recognise it without decrypting.
class CreateDealerProfilesTable extends Migration
{
    public function up(): void
    {
        $this->execute("
            CREATE TABLE IF NOT EXISTS dealer_profiles (
                id                        BIGINT PRIMARY KEY AUTO_INCREMENT,
                user_id                   BIGINT NOT NULL,
                status                    ENUM('draft','pending_review','under_review','approved','rejected','suspended') NOT NULL DEFAULT 'draft',
                dealer_code               VARCHAR(30) NULL,

                business_name             VARCHAR(255) NULL,
                business_type             VARCHAR(50) NULL,
                trade_licence_number      VARCHAR(100) NULL,
                trade_licence_expiry      DATE NULL,
                trn                       VARCHAR(15) NULL,
                business_email            VARCHAR(191) NULL,
                business_phone            VARCHAR(30) NULL,
                whatsapp_number           VARCHAR(30) NULL,

                owner_name                VARCHAR(255) NULL,
                owner_id_type             ENUM('emirates_id','driving_licence') NULL,
                owner_id_number_enc       TEXT NULL,
                owner_id_last4            VARCHAR(4) NULL,

                address_line              VARCHAR(255) NULL,
                emirate                   ENUM('Abu Dhabi','Dubai','Sharjah','Ajman','Umm Al Quwain','Ras Al Khaimah','Fujairah') NULL,
                city                      VARCHAR(100) NULL,
                area                      VARCHAR(150) NULL,
                po_box                    VARCHAR(20) NULL,
                map_url                   VARCHAR(500) NULL,
                latitude                  DECIMAL(10,7) NULL,
                longitude                 DECIMAL(10,7) NULL,
                notes                     TEXT NULL,

                wholesale_enabled         TINYINT(1) NOT NULL DEFAULT 1,
                requires_quotation        TINYINT(1) NOT NULL DEFAULT 1,
                force_quotation           TINYINT(1) NOT NULL DEFAULT 0,
                first_order_completed_at  TIMESTAMP NULL,
                activated_at              TIMESTAMP NULL,
                expires_at                TIMESTAMP NULL,

                allow_resubmission        TINYINT(1) NOT NULL DEFAULT 1,
                rejection_reason          TEXT NULL,
                info_request_message      TEXT NULL,
                suspension_reason         TEXT NULL,
                submitted_at              TIMESTAMP NULL,
                reviewed_by               BIGINT NULL,
                reviewed_at               TIMESTAMP NULL,

                created_at                TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at                TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

                UNIQUE KEY uq_dealer_profiles_user (user_id),
                UNIQUE KEY uq_dealer_profiles_dealer_code (dealer_code),
                INDEX idx_dealer_profiles_status_submitted (status, submitted_at),
                INDEX idx_dealer_profiles_business_name (business_name),
                INDEX idx_dealer_profiles_trade_licence (trade_licence_number),
                CONSTRAINT fk_dealer_profiles_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE RESTRICT,
                CONSTRAINT fk_dealer_profiles_reviewed_by FOREIGN KEY (reviewed_by) REFERENCES users(id) ON DELETE SET NULL
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
        ");
    }

    public function down(): void
    {
        $this->execute("DROP TABLE IF EXISTS dealer_profiles;");
    }
}
