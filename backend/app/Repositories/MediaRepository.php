<?php

declare(strict_types=1);

namespace App\Repositories;

class MediaRepository extends BaseRepository
{
    public function __construct()
    {
        parent::__construct('media');
    }
}
