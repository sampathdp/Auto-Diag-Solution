<?php

declare(strict_types=1);

namespace App\Controllers;

use App\Core\Request;
use App\Services\NotificationPreferenceService;

class AccountNotificationController extends BaseController
{
    private NotificationPreferenceService $service;

    public function __construct()
    {
        $this->service = new NotificationPreferenceService();
    }

    public function show(Request $request): void
    {
        $this->success($this->service->get((int)$request->user->id));
    }

    public function update(Request $request): void
    {
        $prefs = $this->service->update((int)$request->user->id, $request->all());
        $this->success($prefs, 'Preferences updated');
    }
}
