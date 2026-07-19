<?php

declare(strict_types=1);

use App\Core\Database\Migration;

class AlterUsersAddProfileFields extends Migration
{
    public function up(): void
    {
        $this->execute("ALTER TABLE users ADD COLUMN dob DATE NULL AFTER phone;");
        $this->execute("ALTER TABLE users ADD COLUMN language VARCHAR(5) NOT NULL DEFAULT 'en' AFTER dob;");
        $this->execute("ALTER TABLE users ADD COLUMN avatar_url VARCHAR(500) NULL AFTER language;");
    }

    public function down(): void
    {
        $this->execute("ALTER TABLE users DROP COLUMN avatar_url;");
        $this->execute("ALTER TABLE users DROP COLUMN language;");
        $this->execute("ALTER TABLE users DROP COLUMN dob;");
    }
}
