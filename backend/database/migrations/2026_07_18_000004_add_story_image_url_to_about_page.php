<?php

declare(strict_types=1);

use App\Core\Database\Migration;

class AddStoryImageUrlToAboutPage extends Migration
{
    public function up(): void
    {
        // Backfills the existing singleton row with the image path that was hardcoded
        // in the frontend before this column existed, so the storefront never briefly
        // shows a blank image after this migration runs.
        $this->execute("
            ALTER TABLE about_page
                ADD COLUMN story_image_url VARCHAR(500) NOT NULL DEFAULT '/about-warehouse.png' AFTER story_image_tag_ar;
        ");
    }

    public function down(): void
    {
        $this->execute("ALTER TABLE about_page DROP COLUMN story_image_url;");
    }
}
