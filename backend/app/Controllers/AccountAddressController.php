<?php

declare(strict_types=1);

namespace App\Controllers;

use App\Core\Request;
use App\Services\AddressService;

class AccountAddressController extends BaseController
{
    private AddressService $service;

    public function __construct()
    {
        $this->service = new AddressService();
    }

    public function index(Request $request): void
    {
        $this->success($this->service->list((int)$request->user->id));
    }

    public function store(Request $request): void
    {
        $address = $this->service->create((int)$request->user->id, $request->all());
        $this->success($address, 'Address added successfully', 201);
    }

    public function update(Request $request): void
    {
        $address = $this->service->update((int)$request->user->id, (int)$request->getParam('id'), $request->all());
        $this->success($address, 'Address updated successfully');
    }

    public function destroy(Request $request): void
    {
        $this->service->delete((int)$request->user->id, (int)$request->getParam('id'));
        $this->success(null, 'Address removed');
    }

    public function setDefault(Request $request): void
    {
        $this->service->setDefault((int)$request->user->id, (int)$request->getParam('id'));
        $this->success(null, 'Default address updated');
    }
}
