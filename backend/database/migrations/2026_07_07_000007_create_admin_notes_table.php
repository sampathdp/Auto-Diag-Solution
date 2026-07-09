<?php

declare(strict_types=1);

use App\Core\Database\Migration;

// Free-text admin notes attached to an order or a customer (the admin panel's
// existing "internal_notes" concept on both entities) — one generic table instead
// of duplicating an order_notes/customer_notes pair.
class CreateAdminNotesTable extends Migration
{
    public function up(): void
    {
        $this->execute("
            CREATE TABLE IF NOT EXISTS admin_notes (
                id          BIGINT PRIMARY KEY AUTO_INCREMENT,
                entity_type ENUM('order','customer') NOT NULL,
                entity_id   BIGINT NOT NULL,
                admin_id    BIGINT NULL,
                note        TEXT NOT NULL,
                created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                INDEX idx_admin_notes_entity (entity_type, entity_id, created_at),
                CONSTRAINT fk_admin_notes_admin FOREIGN KEY (admin_id) REFERENCES users(id) ON DELETE SET NULL
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
        ");
    }

    public function down(): void
    {
        $this->execute("DROP TABLE IF EXISTS admin_notes;");
    }
}
