<?php

declare(strict_types=1);

use App\Core\Database\Migration;

// Metadata for files held in App\Core\PrivateStorage. storage_key is never sent to a
// browser: APIs expose the row id and stream the file after an ownership or
// permission check. A re-upload marks the previous row 'superseded' (kept for audit).
class CreateDealerDocumentsTable extends Migration
{
    public function up(): void
    {
        $this->execute("
            CREATE TABLE IF NOT EXISTS dealer_documents (
                id                 BIGINT PRIMARY KEY AUTO_INCREMENT,
                dealer_profile_id  BIGINT NOT NULL,
                doc_type           ENUM('trade_licence','trn_certificate','emirates_id_front','emirates_id_back','dl_front','dl_back','payment_proof','cheque_image','other') NOT NULL,
                storage_key        VARCHAR(255) NOT NULL,
                original_name      VARCHAR(150) NOT NULL,
                mime_type          VARCHAR(100) NOT NULL,
                size_bytes         INT UNSIGNED NOT NULL,
                sha256             CHAR(64) NOT NULL,
                status             ENUM('active','superseded') NOT NULL DEFAULT 'active',
                uploaded_by        BIGINT NULL,
                created_at         TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                UNIQUE KEY uq_dealer_documents_storage_key (storage_key),
                INDEX idx_dealer_documents_profile (dealer_profile_id, doc_type, status),
                CONSTRAINT fk_dealer_documents_profile FOREIGN KEY (dealer_profile_id) REFERENCES dealer_profiles(id) ON DELETE RESTRICT,
                CONSTRAINT fk_dealer_documents_uploaded_by FOREIGN KEY (uploaded_by) REFERENCES users(id) ON DELETE SET NULL
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
        ");
    }

    public function down(): void
    {
        $this->execute("DROP TABLE IF EXISTS dealer_documents;");
    }
}
