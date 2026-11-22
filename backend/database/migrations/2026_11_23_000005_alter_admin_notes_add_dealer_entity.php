<?php

declare(strict_types=1);

use App\Core\Database\Migration;

// Lets the existing internal-notes panel (admin_notes) be used on dealer applications.
// Append-only ENUM change; down() removes dealer notes first so the narrower ENUM fits.
class AlterAdminNotesAddDealerEntity extends Migration
{
    public function up(): void
    {
        $this->execute("ALTER TABLE admin_notes MODIFY COLUMN entity_type ENUM('order','customer','dealer') NOT NULL;");
    }

    public function down(): void
    {
        $this->execute("DELETE FROM admin_notes WHERE entity_type = 'dealer';");
        $this->execute("ALTER TABLE admin_notes MODIFY COLUMN entity_type ENUM('order','customer') NOT NULL;");
    }
}
