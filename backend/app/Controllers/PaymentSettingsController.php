<?php

declare(strict_types=1);

namespace App\Controllers;

use App\Core\Request;
use App\Services\PaymentService;

class PaymentSettingsController extends BaseController
{
    private PaymentService $paymentService;

    public function __construct()
    {
        $this->paymentService = new PaymentService();
    }

    public function show(Request $request): void
    {
        $salonId = \App\Core\Auth\TenantContext::getTenantId();
        $methods = $this->paymentService->getSettings();
        
        $salon = \App\Core\Database\DatabaseManager::query(
            "SELECT require_payment_upfront, upfront_type, upfront_amount FROM salons WHERE id = :id",
            ['id' => $salonId]
        )->fetch();
        
        $this->success([
            'methods' => $methods,
            'require_payment_upfront' => (bool)($salon['require_payment_upfront'] ?? false),
            'upfront_type' => $salon['upfront_type'] ?? 'percentage',
            'upfront_amount' => $salon['upfront_amount'] ?? 0
        ]);
    }

    public function update(Request $request): void
    {
        try {
            $this->paymentService->updateSettings($request->all(), $_FILES);
            $this->success(null, "Payment settings updated successfully.");
        } catch (\Exception $e) {
            $this->error($e->getMessage());
        }
    }
}
