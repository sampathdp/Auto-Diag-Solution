<?php

declare(strict_types=1);

use App\Core\Database\Migration;

class CreateOrderStatusHistoryTable extends Migration
{
    public function up(): void
    {
        $this->execute("
            CREATE TABLE IF NOT EXISTS order_status_history (
                id         BIGINT PRIMARY KEY AUTO_INCREMENT,
                order_id   BIGINT NOT NULL,
                status     VARCHAR(50) NOT NULL,
                note       TEXT NULL,
                changed_by BIGINT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                INDEX idx_order_status_history_order_id (order_id),
                FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
                FOREIGN KEY (changed_by) REFERENCES users(id) ON DELETE SET NULL
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
        ");
    }

    public function down(): void
    {
        $this->execute("DROP TABLE IF EXISTS order_status_history;");
    }
}
