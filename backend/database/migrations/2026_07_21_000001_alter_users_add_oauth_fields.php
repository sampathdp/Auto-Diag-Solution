<?php

declare(strict_types=1);

use App\Core\Database\Migration;

class AlterUsersAddOauthFields extends Migration
{
    public function up(): void
    {
        // Social-only accounts have no password.
        $this->execute("ALTER TABLE users MODIFY COLUMN password VARCHAR(255) NULL;");
        $this->execute("ALTER TABLE users ADD COLUMN oauth_provider VARCHAR(20) NULL AFTER password;");
        $this->execute("ALTER TABLE users ADD COLUMN oauth_id VARCHAR(191) NULL AFTER oauth_provider;");
        $this->execute("ALTER TABLE users ADD UNIQUE INDEX uq_users_oauth (oauth_provider, oauth_id);");
    }

    public function down(): void
    {
        $this->execute("ALTER TABLE users DROP INDEX uq_users_oauth;");
        $this->execute("ALTER TABLE users DROP COLUMN oauth_id;");
        $this->execute("ALTER TABLE users DROP COLUMN oauth_provider;");
        $this->execute("ALTER TABLE users MODIFY COLUMN password VARCHAR(255) NOT NULL;");
    }
}
