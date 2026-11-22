<?php

declare(strict_types=1);

namespace App\Controllers;

use App\Core\Request;
use App\Services\SettingService;

class SettingController extends BaseController
{
    private SettingService $service;

    public function __construct()
    {
        $this->service = new SettingService();
    }

    public function index(Request $request): void
    {
        $this->success($this->service->list());
    }

    public function publicAnnouncement(Request $request): void
    {
        $this->success($this->service->publicAnnouncement());
    }

    public function show(Request $request): void
    {
        $this->success($this->service->find((string)$request->getParam('key')));
    }

    public function store(Request $request): void
    {
        $setting = $this->service->create($request->all(), (int)$request->user->id);
        $this->success($setting, 'Setting created successfully', 201);
    }

    public function update(Request $request): void
    {
        $setting = $this->service->update((string)$request->getParam('key'), $request->all(), (int)$request->user->id);
        $this->success($setting, 'Setting updated successfully');
    }

    public function bulkUpdate(Request $request): void
    {
        $items = $request->input('settings');
        if (!is_array($items)) {
            $this->error('settings must be an object of {key: value}', null, 400);
            return;
        }
        $settings = $this->service->bulkUpdate($items, (int)$request->user->id);
        $this->success($settings, 'Settings updated successfully');
    }

    public function destroy(Request $request): void
    {
        $this->service->delete((string)$request->getParam('key'), (int)$request->user->id);
        $this->success(null, 'Setting deleted successfully');
    }
}
