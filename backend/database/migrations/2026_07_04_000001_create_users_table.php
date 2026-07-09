<?php

declare(strict_types=1);

use App\Core\Database\Migration;

class CreateUsersTable extends Migration
{
    public function up(): void
    {
        $this->execute("
            CREATE TABLE IF NOT EXISTS users (
                id                      BIGINT PRIMARY KEY AUTO_INCREMENT,
                name                    VARCHAR(255) NOT NULL,
                email                   VARCHAR(191) NOT NULL,
                phone                   VARCHAR(30) NULL,
                password                VARCHAR(255) NOT NULL,
                role                    ENUM('admin','customer') NOT NULL DEFAULT 'customer',
                needs_password_change   TINYINT(1) NOT NULL DEFAULT 0,
                two_factor_secret       VARCHAR(64) NULL,
                two_factor_enabled      TINYINT(1) NOT NULL DEFAULT 0,
                two_factor_confirmed_at TIMESTAMP NULL,
                is_active               TINYINT(1) NOT NULL DEFAULT 1,
                created_at              TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at              TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                UNIQUE KEY uq_users_email (email),
                INDEX idx_users_role (role)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
        ");
    }

    public function down(): void
    {
        $this->execute("DROP TABLE IF EXISTS users;");
    }
}
