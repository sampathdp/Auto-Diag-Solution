<?php

declare(strict_types=1);

use App\Core\Database\Migration;

class CreateSuppliersTable extends Migration
{
    public function up(): void
    {
        // api_key is a placeholder for phase 1 — store a real secret here only if it's
        // encrypted at rest; prefer referencing an env-stored credential by name instead.
        $this->execute("
            CREATE TABLE IF NOT EXISTS suppliers (
                id              BIGINT PRIMARY KEY AUTO_INCREMENT,
                name            VARCHAR(255) NOT NULL,
                slug            VARCHAR(255) NOT NULL,
                contact_email   VARCHAR(255) NULL,
                contact_phone   VARCHAR(30) NULL,
                api_base_url    VARCHAR(500) NULL,
                api_key         VARCHAR(500) NULL,
                status          ENUM('active','inactive') NOT NULL DEFAULT 'active',
                last_synced_at  TIMESTAMP NULL,
                created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                UNIQUE KEY uq_suppliers_slug (slug)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
        ");
    }

    public function down(): void
    {
        $this->execute("DROP TABLE IF EXISTS suppliers;");
    }
}
