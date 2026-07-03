<?php

declare(strict_types=1);

namespace App\Controllers;

use App\Core\Request;
use App\Services\CustomerService;

class CustomerController extends BaseController
{
    private CustomerService $customerService;

    public function __construct()
    {
        $this->customerService = new CustomerService();
    }

    public function index(Request $request): void
    {
        $filters = $request->all();

        $branchId = \App\Core\Auth\TenantContext::getBranchId() !== null
            ? \App\Core\Auth\TenantContext::getBranchId()
            : ($request->input('branch_id') ? (int)$request->input('branch_id') : null);

        $page    = (int)($request->input('page') ?? 1);
        $perPage = (int)($request->input('per_page') ?? 50);

        $result = $this->customerService->getAllCustomers($filters, $page, $perPage, $branchId);
        $this->success($result);
    }

    public function store(Request $request): void
    {
        try {
            $data = $request->all();
            
            $branchId = \App\Core\Auth\TenantContext::getBranchId() !== null 
                ? \App\Core\Auth\TenantContext::getBranchId() 
                : (!empty($data['branch_id']) ? (int)$data['branch_id'] : null);

            if ($branchId !== null) {
                $data['branch_id'] = $branchId;
            }

            $id = $this->customerService->createCustomer($data);
            $this->success(['id' => $id], 'Customer created successfully', 201);
        } catch (\Exception $e) {
            $this->error($e->getMessage());
        }
    }

    public function update(Request $request): void
    {
        $id = (int)$request->getParam('id');
        try {
            $this->customerService->updateCustomer($id, $request->all());
            $this->success(null, 'Customer updated successfully');
        } catch (\Exception $e) {
            $this->error($e->getMessage());
        }
    }

    public function destroy(Request $request): void
    {
        $id = (int)$request->getParam('id');
        $this->customerService->deleteCustomer($id);
        $this->success(null, 'Customer deleted successfully');
    }

    public function appointments(Request $request): void
    {
        $id = (int)$request->getParam('id');
        $appointmentService = new \App\Services\AppointmentService();
        $history = $appointmentService->getCustomerAppointments($id);
        $this->success($history);
    }
}
