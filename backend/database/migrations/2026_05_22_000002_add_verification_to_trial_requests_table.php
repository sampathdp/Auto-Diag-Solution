<?php

declare(strict_types=1);

use App\Core\Database\Migration;

class AddVerificationToTrialRequestsTable extends Migration
{
    public function up(): void
    {
        $this->execute("ALTER TABLE trial_requests 
            ADD COLUMN email_verified TINYINT(1) DEFAULT 0 AFTER status,
            ADD COLUMN verification_code VARCHAR(10) DEFAULT NULL AFTER email_verified;");
    }

    public function down(): void
    {
        $this->execute("ALTER TABLE trial_requests 
            DROP COLUMN email_verified,
            DROP COLUMN verification_code;");
    }
}
