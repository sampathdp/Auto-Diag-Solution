<?php

declare(strict_types=1);

use App\Core\Database\Migration;
use App\Core\Database\Schema;

class CreateContactMessagesTable extends Migration
{
    public function up(): void
    {
        $sql = Schema::create('contact_messages', function (Schema $table) {
            $table->id();
            $table->string('name', 255, false);
            $table->string('email', 191, false);
            $table->string('subject', 255, true);
            $table->text('message', false);
            $table->enum('status', ['pending', 'replied', 'ignored'], 'pending');
            $table->timestamps();
        });

        $this->execute($sql);
    }

    public function down(): void
    {
        $this->execute(Schema::drop('contact_messages'));
    }
}
