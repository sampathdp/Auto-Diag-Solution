<?php

declare(strict_types=1);

namespace App\Controllers;

use App\Core\Request;
use App\Services\HomePageService;

class HomePageController extends BaseController
{
    private HomePageService $service;

    public function __construct()
    {
        $this->service = new HomePageService();
    }

    // Public — the storefront home page fetches this with no auth.
    public function show(Request $request): void
    {
        $this->success($this->service->get());
    }

    // Admin-only — see routes/api.php admin group.
    public function update(Request $request): void
    {
        $this->success($this->service->update($request->all()), 'Home page updated successfully');
    }
}
