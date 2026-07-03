<?php

declare(strict_types=1);

use App\Core\Database\Migration;

class CreateStaffServiceCommissionsTable extends Migration
{
    public function up(): void
    {
        $this->execute("
            CREATE TABLE IF NOT EXISTS staff_service_commissions (
                id            INT AUTO_INCREMENT PRIMARY KEY,
                staff_id      INT NOT NULL,
                service_id    INT NOT NULL,
                commission_type  ENUM('percentage','fixed') NOT NULL DEFAULT 'percentage',
                commission_value DECIMAL(10,2) NOT NULL DEFAULT 0,
                created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                UNIQUE KEY uq_staff_service (staff_id, service_id),
                FOREIGN KEY (staff_id)   REFERENCES staff(id)    ON DELETE CASCADE,
                FOREIGN KEY (service_id) REFERENCES services(id) ON DELETE CASCADE
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
        ");
    }

    public function down(): void
    {
        $this->execute("DROP TABLE IF EXISTS staff_service_commissions;");
    }
}
