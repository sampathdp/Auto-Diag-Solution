<?php

declare(strict_types=1);

namespace App\Services;

use App\Repositories\PaymentRepository;
use App\Repositories\PaymentProofRepository;
use App\Core\Auth\TenantContext;
use App\Core\FileUploader;
use App\Core\Database\DatabaseManager;

class PaymentService extends BaseService
{
    private PaymentRepository $paymentRepo;
    private PaymentProofRepository $proofRepo;

    public function __construct()
    {
        $this->paymentRepo = new PaymentRepository();
        $this->proofRepo = new PaymentProofRepository();
    }

    public function getSettings(): array
    {
        $salonId   = TenantContext::getTenantId();
        $methods   = $this->paymentRepo->getPaymentMethods((int)$salonId);
        $appUrl    = rtrim($_ENV['APP_URL'] ?? '', '/');

        // Normalise qr_image to an absolute URL (avoids localhost:8000 on production)
        foreach ($methods as &$m) {
            if (!empty($m['qr_image']) && strpos($m['qr_image'], 'http') !== 0) {
                $m['qr_image'] = $appUrl . '/' . ltrim($m['qr_image'], '/');
            }
        }
        unset($m);

        return $methods;
    }

    public function updateSettings(array $data, array $files): void
    {
        $salonId = (int)TenantContext::getTenantId();
        
        foreach (['lanka_qr', 'bank_transfer', 'cash'] as $method) {
            $isEnabled = isset($data[$method . '_enabled']);
            
            $methodData = [
                'is_enabled' => $isEnabled,
                'instructions' => $data[$method . '_instructions'] ?? null
            ];

            if ($method === 'bank_transfer') {
                $methodData['bank_name'] = $data['bank_name'] ?? null;
                $methodData['account_number'] = $data['account_number'] ?? null;
                $methodData['account_name'] = $data['account_name'] ?? null;
                $methodData['branch_name'] = $data['branch_name'] ?? null;
            }

            if ($method === 'lanka_qr' && isset($files['qr_image'])) {
                $path = FileUploader::upload($files['qr_image'], "salon_{$salonId}/qr");
                if ($path) {
                    $methodData['qr_image'] = $path;
                }
            }

            $this->paymentRepo->updateMethod($salonId, $method, $methodData);
        }

        // Update salon upfront payment setting
        $requireUpfront = isset($data['require_payment_upfront']) && ($data['require_payment_upfront'] === 'on' || $data['require_payment_upfront'] === 'true' || $data['require_payment_upfront'] === '1');
        $upfrontType = $data['upfront_type'] ?? 'percentage';
        $upfrontAmount = $data['upfront_amount'] ?? 0;

        DatabaseManager::query(
            "UPDATE salons SET require_payment_upfront = :val, upfront_type = :type, upfront_amount = :amt WHERE id = :id",
            ['val' => $requireUpfront ? 1 : 0, 'type' => $upfrontType, 'amt' => $upfrontAmount, 'id' => $salonId]
        );
    }

    public function submitProof(array $data, array $files): int
    {
        $salonId = (int)($data['salon_id'] ?? 0);
        $appointmentId = (int)($data['appointment_id'] ?? 0);

        if (!$salonId || !$appointmentId || !isset($files['proof_image'])) {
            throw new \Exception("Missing required payment data.");
        }

        $proofImage = FileUploader::upload($files['proof_image'], "salon_{$salonId}/proofs");

        DatabaseManager::beginTransaction();
        try {
            // 1. Create proof record
            $proofId = $this->proofRepo->create([
                'salon_id' => $salonId,
                'appointment_id' => $appointmentId,
                'proof_image' => $proofImage,
                'amount' => $data['amount'] ?? 0,
                'status' => 'pending'
            ]);

            // 2. Update appointment status
            DatabaseManager::query(
                "UPDATE appointments SET payment_status = 'pending_verification', payment_method = :method WHERE id = :id",
                ['method' => $data['method'] ?? 'lanka_qr', 'id' => $appointmentId]
            );

            DatabaseManager::commit();
            return $proofId;
        } catch (\Exception $e) {
            DatabaseManager::rollBack();
            throw $e;
        }
    }

    public function approveProof(int $proofId, int $adminId): void
    {
        $proof = $this->proofRepo->find($proofId);
        if (!$proof) throw new \Exception("Proof not found");

        DatabaseManager::beginTransaction();
        try {
            $this->proofRepo->update($proofId, [
                'status' => 'approved',
                'verified_by' => $adminId,
                'verified_at' => date('Y-m-d H:i:s')
            ]);

            DatabaseManager::query(
                "UPDATE appointments SET payment_status = 'paid' WHERE id = :id",
                ['id' => $proof['appointment_id']]
            );

            DatabaseManager::commit();
        } catch (\Exception $e) {
            DatabaseManager::rollBack();
            throw $e;
        }
    }

    public function rejectProof(int $proofId, string $reason, int $adminId): void
    {
        $proof = $this->proofRepo->find($proofId);
        if (!$proof) throw new \Exception("Proof not found");

        DatabaseManager::beginTransaction();
        try {
            $this->proofRepo->update($proofId, [
                'status' => 'rejected',
                'rejection_reason' => $reason,
                'verified_by' => $adminId,
                'verified_at' => date('Y-m-d H:i:s')
            ]);

            DatabaseManager::query(
                "UPDATE appointments SET payment_status = 'unpaid' WHERE id = :id",
                ['id' => $proof['appointment_id']]
            );

            DatabaseManager::commit();
        } catch (\Exception $e) {
            DatabaseManager::rollBack();
            throw $e;
        }
    }
}
