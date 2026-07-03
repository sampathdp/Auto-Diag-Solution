<?php

declare(strict_types=1);

namespace App\Controllers;

use App\Core\Request;
use App\Services\PaymentService;
use App\Repositories\PaymentProofRepository;
use App\Core\Auth\TenantContext;

class PaymentProofController extends BaseController
{
    private PaymentService $paymentService;
    private PaymentProofRepository $proofRepo;

    public function __construct()
    {
        $this->paymentService = new PaymentService();
        $this->proofRepo = new PaymentProofRepository();
    }

    public function index(Request $request): void
    {
        $salonId = TenantContext::getTenantId();
        $proofs = $this->proofRepo->getPendingProofs((int)$salonId);
        $this->success($proofs);
    }

    public function history(Request $request): void
    {
        $salonId = TenantContext::getTenantId();
        $history = $this->proofRepo->getProofHistory((int)$salonId);
        $this->success($history);
    }

    public function store(Request $request): void
    {
        try {
            $id = $this->paymentService->submitProof($request->all(), $_FILES);
            $this->success(['id' => $id], "Payment proof uploaded. Awaiting verification.");
        } catch (\Exception $e) {
            $this->error($e->getMessage());
        }
    }

    public function approve(Request $request): void
    {
        $id = (int)$request->getParam('id');
        $adminId = (int)TenantContext::getUserId();
        try {
            $this->paymentService->approveProof($id, $adminId);
            $this->success(null, "Payment approved.");
        } catch (\Exception $e) {
            $this->error($e->getMessage());
        }
    }

    public function reject(Request $request): void
    {
        $id = (int)$request->getParam('id');
        $reason = $request->get('reason', 'Verification failed');
        $adminId = (int)TenantContext::getUserId();
        try {
            $this->paymentService->rejectProof($id, $reason, $adminId);
            $this->success(null, "Payment proof rejected.");
        } catch (\Exception $e) {
            $this->error($e->getMessage());
        }
    }
}
