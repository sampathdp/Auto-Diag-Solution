<?php

declare(strict_types=1);

namespace App\Controllers;

use App\Core\Request;
use App\Services\AboutPageService;

class AboutPageController extends BaseController
{
    private AboutPageService $service;

    public function __construct()
    {
        $this->service = new AboutPageService();
    }

    // Public — the storefront About Us page fetches this with no auth.
    public function show(Request $request): void
    {
        $this->success($this->service->get());
    }

    // Admin-only — see routes/api.php admin group.
    public function update(Request $request): void
    {
        $this->success($this->service->update($request->all()), 'About page updated successfully');
    }
}
