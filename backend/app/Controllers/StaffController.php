<?php

declare(strict_types=1);

namespace App\Controllers;

use App\Core\Request;
use App\Services\StaffService;

class StaffController extends BaseController
{
    private StaffService $staffService;

    public function __construct()
    {
        $this->staffService = new StaffService();
    }

    public function index(Request $request): void
    {
        $result = $this->staffService->getAllStaff();
        $this->success($result);
    }

    public function changePassword(Request $request): void
    {
        $id = (int)$request->getParam('id');
        try {
            $password = $request->input('password') ?? '';
            $this->staffService->changePassword($id, $password);
            $this->success(null, 'Password updated successfully.');
        } catch (\Exception $e) {
            $this->error($e->getMessage());
        }
    }

    public function store(Request $request): void
    {
        try {
            $id = $this->staffService->createStaff($request->all());
            $this->success(['id' => $id], 'Staff member added successfully', 201);
        } catch (\Exception $e) {
            $this->error($e->getMessage());
        }
    }

    public function update(Request $request): void
    {
        $id = (int)$request->getParam('id');
        try {
            $this->staffService->updateStaff($id, $request->all());
            $this->success(null, 'Staff details updated successfully');
        } catch (\Exception $e) {
            $this->error($e->getMessage());
        }
    }

    public function destroy(Request $request): void
    {
        $id = (int)$request->getParam('id');
        try {
            $this->staffService->deleteStaff($id);
            $this->success(null, 'Staff member removed successfully');
        } catch (\Exception $e) {
            $this->error($e->getMessage());
        }
    }

    public function getServiceCommissions(Request $request): void
    {
        $id = (int)$request->getParam('id');
        try {
            $this->success($this->staffService->getServiceCommissions($id));
        } catch (\Exception $e) {
            $this->error($e->getMessage());
        }
    }

    public function setServiceCommissions(Request $request): void
    {
        $id = (int)$request->getParam('id');
        try {
            $rows = $request->input('commissions') ?? [];
            $this->staffService->setServiceCommissions($id, $rows);
            $this->success(null, 'Service commissions updated successfully');
        } catch (\Exception $e) {
            $this->error($e->getMessage());
        }
    }

    public function getPermissions(Request $request): void
    {
        $id = (int)$request->getParam('id');
        try {
            $permissions = $this->staffService->getStaffPermissions($id);
            $this->success($permissions);
        } catch (\Exception $e) {
            $this->error($e->getMessage());
        }
    }

    public function setPermissions(Request $request): void
    {
        $id = (int)$request->getParam('id');
        try {
            $permissions = $request->input('permissions') ?? [];
            $this->staffService->setStaffPermissions($id, $permissions);
            $this->success(null, 'Permissions updated successfully');
        } catch (\Exception $e) {
            $this->error($e->getMessage());
        }
    }
}
