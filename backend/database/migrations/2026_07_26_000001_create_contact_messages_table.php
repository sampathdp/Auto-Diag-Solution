<?php

declare(strict_types=1);

use App\Core\Database\Migration;

// Backs the public /contact page's form — previously simulated client-side with a
// setTimeout and no backend at all, so every submission was silently discarded.
class CreateContactMessagesTable extends Migration
{
    public function up(): void
    {
        $this->execute("
            CREATE TABLE IF NOT EXISTS contact_messages (
                id         BIGINT PRIMARY KEY AUTO_INCREMENT,
                name       VARCHAR(255) NOT NULL,
                email      VARCHAR(255) NOT NULL,
                subject    VARCHAR(255) NOT NULL,
                message    TEXT NOT NULL,
                is_read    TINYINT(1) NOT NULL DEFAULT 0,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                INDEX idx_contact_messages_created_at (created_at)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
        ");
    }

    public function down(): void
    {
        $this->execute("DROP TABLE IF EXISTS contact_messages;");
    }
}
