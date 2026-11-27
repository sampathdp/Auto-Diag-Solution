<?php

declare(strict_types=1);

use App\Core\Database\Migration;

// B2B Phase 4: quotations (INTEGRATION_ARCHITECTURE.md §2.2, §4).
//
// dealer_quotations        the quote itself; its items table always holds the CURRENT version.
// dealer_quotation_items   current lines (prices the dealer would pay if they accept now).
// dealer_quotation_versions one frozen snapshot per version, v1 written at submission. A
//                           revision writes a new row, so no earlier version is ever lost.
// dealer_quotation_messages dealer-visible and internal (staff-only) messages.
//
// converted_order_id is UNIQUE, and orders.quotation_id (UNIQUE since Phase 3) gets its FK
// here: together they make conversion exactly-once even under parallel accepts.
class CreateDealerQuotationsTables extends Migration
{
    public function up(): void
    {
        $this->execute("
            CREATE TABLE IF NOT EXISTS dealer_quotations (
                id                     BIGINT PRIMARY KEY AUTO_INCREMENT,
                quotation_number       VARCHAR(30) NOT NULL,
                dealer_profile_id      BIGINT NOT NULL,
                user_id                BIGINT NOT NULL,
                status                 ENUM('submitted','under_review','discussion_required','revised','approved','rejected','expired','converted','cancelled') NOT NULL DEFAULT 'submitted',
                current_version        INT UNSIGNED NOT NULL DEFAULT 1,
                subtotal               DECIMAL(10,2) NOT NULL DEFAULT 0,
                discount_amount        DECIMAL(10,2) NOT NULL DEFAULT 0,
                shipping_amount        DECIMAL(10,2) NOT NULL DEFAULT 0,
                vat_rate               DECIMAL(5,2) NOT NULL DEFAULT 5.00,
                vat_amount             DECIMAL(10,2) NOT NULL DEFAULT 0,
                total                  DECIMAL(10,2) NOT NULL DEFAULT 0,
                currency               CHAR(3) NOT NULL DEFAULT 'AED',
                payment_method_pref    VARCHAR(30) NULL,
                shipping_address_id    BIGINT NULL,
                shipping_snapshot      JSON NULL,
                dealer_note            TEXT NULL,
                is_first_order         TINYINT(1) NOT NULL DEFAULT 0,
                expires_at             TIMESTAMP NULL,
                expiry_reminder_sent_at TIMESTAMP NULL,
                approved_by            BIGINT NULL,
                approved_at            TIMESTAMP NULL,
                rejection_reason       TEXT NULL,
                rejected_by_role       ENUM('admin','dealer') NULL,
                dealer_accepted_at     TIMESTAMP NULL,
                converted_order_id     BIGINT NULL,
                converted_at           TIMESTAMP NULL,
                submitted_at           TIMESTAMP NULL,
                created_at             TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at             TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                UNIQUE KEY uq_dealer_quotations_number (quotation_number),
                UNIQUE KEY uq_dealer_quotations_converted_order (converted_order_id),
                INDEX idx_dealer_quotations_dealer (dealer_profile_id, created_at),
                INDEX idx_dealer_quotations_status (status, updated_at),
                INDEX idx_dealer_quotations_expiry (status, expires_at),
                CONSTRAINT fk_dealer_quotations_dealer FOREIGN KEY (dealer_profile_id) REFERENCES dealer_profiles(id) ON DELETE RESTRICT,
                CONSTRAINT fk_dealer_quotations_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE RESTRICT,
                CONSTRAINT fk_dealer_quotations_approved_by FOREIGN KEY (approved_by) REFERENCES users(id) ON DELETE SET NULL,
                CONSTRAINT fk_dealer_quotations_order FOREIGN KEY (converted_order_id) REFERENCES orders(id) ON DELETE RESTRICT
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
        ");

        $this->execute("
            CREATE TABLE IF NOT EXISTS dealer_quotation_items (
                id                 BIGINT PRIMARY KEY AUTO_INCREMENT,
                quotation_id       BIGINT NOT NULL,
                product_id         BIGINT NOT NULL,
                sku                VARCHAR(100) NOT NULL,
                name_en            VARCHAR(255) NOT NULL,
                name_ar            VARCHAR(255) NULL,
                quantity           INT UNSIGNED NOT NULL,
                unit_price         DECIMAL(10,2) NOT NULL,
                retail_unit_price  DECIMAL(10,2) NOT NULL,
                line_total         DECIMAL(10,2) NOT NULL,
                vat_inclusive      TINYINT(1) NOT NULL DEFAULT 1,
                free_shipping      TINYINT(1) NOT NULL DEFAULT 0,
                sort_order         INT UNSIGNED NOT NULL DEFAULT 0,
                INDEX idx_dealer_quotation_items_quotation (quotation_id, sort_order),
                CONSTRAINT fk_dealer_quotation_items_quotation FOREIGN KEY (quotation_id) REFERENCES dealer_quotations(id) ON DELETE CASCADE,
                CONSTRAINT fk_dealer_quotation_items_product FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE RESTRICT
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
        ");

        $this->execute("
            CREATE TABLE IF NOT EXISTS dealer_quotation_versions (
                id            BIGINT PRIMARY KEY AUTO_INCREMENT,
                quotation_id  BIGINT NOT NULL,
                version_no    INT UNSIGNED NOT NULL,
                snapshot      JSON NOT NULL,
                reason        VARCHAR(1000) NULL,
                created_by    BIGINT NULL,
                created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                UNIQUE KEY uq_dealer_quotation_versions (quotation_id, version_no),
                CONSTRAINT fk_dealer_quotation_versions_quotation FOREIGN KEY (quotation_id) REFERENCES dealer_quotations(id) ON DELETE CASCADE,
                CONSTRAINT fk_dealer_quotation_versions_user FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
        ");

        $this->execute("
            CREATE TABLE IF NOT EXISTS dealer_quotation_messages (
                id            BIGINT PRIMARY KEY AUTO_INCREMENT,
                quotation_id  BIGINT NOT NULL,
                author_id     BIGINT NULL,
                author_role   ENUM('admin','dealer','system') NOT NULL,
                visibility    ENUM('dealer','internal') NOT NULL DEFAULT 'dealer',
                body          TEXT NOT NULL,
                created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                INDEX idx_dealer_quotation_messages (quotation_id, created_at),
                CONSTRAINT fk_dealer_quotation_messages_quotation FOREIGN KEY (quotation_id) REFERENCES dealer_quotations(id) ON DELETE CASCADE,
                CONSTRAINT fk_dealer_quotation_messages_author FOREIGN KEY (author_id) REFERENCES users(id) ON DELETE SET NULL
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
        ");

        $this->execute("
            ALTER TABLE orders
                ADD CONSTRAINT fk_orders_quotation FOREIGN KEY (quotation_id) REFERENCES dealer_quotations(id) ON DELETE RESTRICT;
        ");
    }

    public function down(): void
    {
        $this->execute("ALTER TABLE orders DROP FOREIGN KEY fk_orders_quotation;");
        $this->execute("DROP TABLE IF EXISTS dealer_quotation_messages;");
        $this->execute("DROP TABLE IF EXISTS dealer_quotation_versions;");
        $this->execute("DROP TABLE IF EXISTS dealer_quotation_items;");
        $this->execute("DROP TABLE IF EXISTS dealer_quotations;");
    }
}
