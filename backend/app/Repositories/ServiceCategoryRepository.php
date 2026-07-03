<?php

declare(strict_types=1);

namespace App\Repositories;

class ServiceCategoryRepository extends TenantAwareRepository
{
    public function __construct()
    {
        parent::__construct('service_categories');
    }
}
