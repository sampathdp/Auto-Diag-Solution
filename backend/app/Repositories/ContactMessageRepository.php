<?php

declare(strict_types=1);

namespace App\Repositories;

class ContactMessageRepository extends BaseRepository
{
    public function __construct()
    {
        parent::__construct('contact_messages');
    }
}
