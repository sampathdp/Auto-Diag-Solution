<?php

declare(strict_types=1);

namespace App\Controllers;

use App\Core\Request;
use App\Services\CustomerVehicleService;

class AccountVehicleController extends BaseController
{
    private CustomerVehicleService $service;

    public function __construct()
    {
        $this->service = new CustomerVehicleService();
    }

    public function index(Request $request): void
    {
        $this->success($this->service->list((int)$request->user->id));
    }

    public function store(Request $request): void
    {
        $vehicle = $this->service->create((int)$request->user->id, $request->all());
        $this->success($vehicle, 'Vehicle added successfully', 201);
    }

    public function update(Request $request): void
    {
        $vehicle = $this->service->update((int)$request->user->id, (int)$request->getParam('id'), $request->all());
        $this->success($vehicle, 'Vehicle updated successfully');
    }

    public function destroy(Request $request): void
    {
        $this->service->delete((int)$request->user->id, (int)$request->getParam('id'));
        $this->success(null, 'Vehicle removed');
    }

    public function setDefault(Request $request): void
    {
        $this->service->setDefault((int)$request->user->id, (int)$request->getParam('id'));
        $this->success(null, 'Default vehicle updated');
    }
}
