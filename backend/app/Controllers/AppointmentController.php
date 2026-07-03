<?php

declare(strict_types=1);

namespace App\Controllers;

use App\Core\Request;
use App\Services\AppointmentService;

class AppointmentController extends BaseController
{
    private AppointmentService $appointmentService;

    public function __construct()
    {
        $this->appointmentService = new AppointmentService();
    }

    public function index(Request $request): void
    {
        $start = $request->input('start') ?? date('Y-m-01');
        $end = $request->input('end') ?? date('Y-m-t');
        $branchId = \App\Core\Auth\TenantContext::getBranchId() !== null 
            ? \App\Core\Auth\TenantContext::getBranchId() 
            : ($request->input('branch_id') ? (int)$request->input('branch_id') : null);

        $result = $this->appointmentService->getAppointments($start, $end, $branchId);
        $this->success($result);
    }

    public function store(Request $request): void
    {
        try {
            $data = $request->all();
            if (\App\Core\Auth\TenantContext::getBranchId() !== null) {
                $data['branch_id'] = \App\Core\Auth\TenantContext::getBranchId();
            }
            $id = $this->appointmentService->createAppointment($data);
            $this->success(['id' => $id], 'Appointment booked successfully', 201);
        } catch (\Exception $e) {
            $this->error($e->getMessage());
        }
    }

    public function update(Request $request): void
    {
        $id = (int)$request->getParam('id');
        try {
            $data = $request->all();
            if (\App\Core\Auth\TenantContext::getBranchId() !== null) {
                $data['branch_id'] = \App\Core\Auth\TenantContext::getBranchId();
            }
            $this->appointmentService->updateAppointment($id, $data);
            $this->success(null, 'Appointment updated successfully');
        } catch (\Exception $e) {
            $this->error($e->getMessage());
        }
    }

    public function destroy(Request $request): void
    {
        $id = (int)$request->getParam('id');
        $this->appointmentService->deleteAppointment($id);
        $this->success(null, 'Appointment cancelled successfully');
    }
}
