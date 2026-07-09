<?php

declare(strict_types=1);

namespace App\Controllers;

use App\Core\Request;
use App\Services\DashboardService;

class DashboardController extends BaseController
{
    private DashboardService $service;

    public function __construct()
    {
        $this->service = new DashboardService();
    }

    public function stats(Request $request): void
    {
        $this->success($this->service->stats());
    }
}
