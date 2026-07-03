<?php

use App\Core\Database\DatabaseManager;

class AddSocialLinksToSalonAppearances
{
    public function up(): void
    {
        $this->execute("ALTER TABLE salon_appearances ADD COLUMN IF NOT EXISTS social_instagram VARCHAR(255) NULL DEFAULT NULL");
        $this->execute("ALTER TABLE salon_appearances ADD COLUMN IF NOT EXISTS social_facebook  VARCHAR(255) NULL DEFAULT NULL");
    }

    public function down(): void
    {
        $this->execute("ALTER TABLE salon_appearances DROP COLUMN IF EXISTS social_instagram");
        $this->execute("ALTER TABLE salon_appearances DROP COLUMN IF EXISTS social_facebook");
    }

    private function execute(string $sql): void
    {
        DatabaseManager::query($sql, []);
    }
}
