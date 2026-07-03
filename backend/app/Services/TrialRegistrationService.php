<?php

declare(strict_types=1);

namespace App\Services;

use App\Repositories\TrialRegistrationRepository;
use App\Core\Database\DatabaseManager;

class TrialRegistrationService extends BaseService
{
    private TrialRegistrationRepository $trialRepo;
    private PasswordGeneratorService $passwordService;
    private PromoCodeService $promoService;

    public function __construct()
    {
        $this->trialRepo = new TrialRegistrationRepository();
        $this->passwordService = new PasswordGeneratorService();
        $this->promoService = new PromoCodeService();
    }

    public function registerTrial(array $data, string $ip): array
    {
        // Delete any unverified requests with the same email to allow re-requesting
        $existing = $this->trialRepo->findByEmail($data['email']);
        if ($existing) {
            if ((int)($existing['email_verified'] ?? 0) === 1) {
                throw new \Exception("A verified trial request with this email already exists.");
            } else {
                DatabaseManager::query("DELETE FROM trial_requests WHERE email = :email AND email_verified = 0", ['email' => $data['email']]);
            }
        }

        if (!empty($data['promo_code'])) {
            // Throws with a user-facing message if the code is invalid/expired/exhausted
            $promo = $this->promoService->validateCode($data['promo_code']);
            $data['promo_code'] = $promo['code'];
        } else {
            $data['promo_code'] = null;
        }

        $otp = (string) rand(100000, 999999);
        $data['ip_address'] = $ip;
        $data['status'] = 'pending';
        $data['email_verified'] = 0;
        $data['verification_code'] = $otp;

        if (array_key_exists('selected_plan', $data)) {
            unset($data['selected_plan']);
        }

        $id = $this->trialRepo->createRequest($data);

        return [
            'id' => $id,
            'email' => $data['email'],
            'otp' => $otp
        ];
    }

    public function approveRequest(int $requestId, int $adminId): array
    {
        $request = $this->trialRepo->find($requestId);
        if (!$request || $request['status'] !== 'pending') {
            throw new \Exception("Invalid or already processed request.");
        }

        try {
            DatabaseManager::beginTransaction();

            // 1. Create Salon (raw SQL — avoids TenantAwareRepository guard on public route)
            $slug = strtolower(str_replace(' ', '-', $request['salon_name'])) . '-' . rand(1000, 9999);
            DatabaseManager::query(
                "INSERT INTO salons (name, slug, email, phone, address, number_of_staff, number_of_branches, plan_id, timezone, currency, subscription_status, is_active)
                 VALUES (:name, :slug, :email, :phone, :address, :staff, :branches, :plan_id, 'Asia/Colombo', 'LKR', 'trial', 1)",
                [
                    'name'     => $request['salon_name'],
                    'slug'     => $slug,
                    'email'    => $request['email'],
                    'phone'    => $request['phone'],
                    'address'  => $request['address'],
                    'staff'    => $request['number_of_staff'] ?? '1-5',
                    'branches' => $request['number_of_branches'] ?? '1',
                    'plan_id'  => $request['plan_id'] ?? null,
                ]
            );
            $salonId = (int) DatabaseManager::getLastInsertId();

            // 1b. Create default business hours for salon
            for ($day = 0; $day < 7; $day++) {
                $sqlHours = "INSERT INTO salon_business_hours (salon_id, day_of_week, is_open, open_time, close_time) 
                             VALUES (:salon_id, :day, 1, '08:00:00', '18:00:00')";
                DatabaseManager::query($sqlHours, [
                    'salon_id' => $salonId,
                    'day' => $day
                ]);
            }

            // 2. Generate Password
            $rawPassword = $this->passwordService->generate();
            $hashedPassword = password_hash($rawPassword, PASSWORD_BCRYPT);

            // 3. Create Owner User (raw SQL — avoids TenantAwareRepository guard on public route)
            DatabaseManager::query(
                "INSERT INTO users (salon_id, name, email, password, role, needs_password_change, is_active)
                 VALUES (:salon_id, :name, :email, :password, 'salon_owner', 1, 1)",
                [
                    'salon_id' => $salonId,
                    'name'     => $request['owner_name'],
                    'email'    => $request['email'],
                    'password' => $hashedPassword,
                ]
            );
            $userId = (int) DatabaseManager::getLastInsertId();

            // 3b. Create Staff Record for Owner
            $sql = "INSERT INTO staff (salon_id, user_id, designation, salary, commission_type, commission_value) 
                    VALUES (:salon_id, :user_id, :designation, 0, 'percentage', 0)";
            DatabaseManager::query($sql, [
                'salon_id' => $salonId,
                'user_id' => $userId,
                'designation' => 'Salon Owner'
            ]);

            // 4. Create Subscription (No dates yet, pending activation)
            $planId = $request['plan_id'] ?? null;

            // Resolve promo code (re-validated here in case it expired/exhausted between
            // signup and email verification) and snapshot the discount onto the subscription
            // so later edits to the promo code never retroactively change this salon's billing.
            $promoCodeId = null;
            $discountPercent = null;
            $discountExpiresAt = null;
            if (!empty($request['promo_code'])) {
                try {
                    $promo = $this->promoService->validateCode($request['promo_code']);
                    $promoCodeId = (int) $promo['id'];
                    $discountPercent = (float) $promo['discount_percent'];
                    $discountExpiresAt = $promo['duration_months']
                        ? date('Y-m-d H:i:s', strtotime("+{$promo['duration_months']} months"))
                        : null;
                    $this->promoService->redeem($promoCodeId);
                } catch (\Exception $e) {
                    // Code became invalid after signup (expired/exhausted) — proceed without a discount
                    $promoCodeId = null;
                }
            }

            $sql = "INSERT INTO subscriptions (salon_id, plan_id, promo_code_id, discount_percent, discount_expires_at, status, starts_at, expires_at)
                    VALUES (:salon_id, :plan_id, :promo_code_id, :discount_percent, :discount_expires_at, 'trial', NULL, NULL)";
            DatabaseManager::query($sql, [
                'salon_id' => $salonId,
                'plan_id' => $planId,
                'promo_code_id' => $promoCodeId,
                'discount_percent' => $discountPercent,
                'discount_expires_at' => $discountExpiresAt,
            ]);

            // 5. Update Request Status
            $this->trialRepo->update($requestId, [
                'status' => 'approved',
                'approved_by' => $adminId,
                'approved_at' => date('Y-m-d H:i:s')
            ]);

            DatabaseManager::commit();

            return [
                'email' => $request['email'],
                'password' => $rawPassword,
                'salon_name' => $request['salon_name']
            ];

        } catch (\Exception $e) {
            DatabaseManager::rollBack();
            throw $e;
        }
    }

    public function activateTrial(int $requestId): bool
    {
        $request = $this->trialRepo->find($requestId);
        if (!$request || $request['status'] !== 'approved' || $request['activation_started_at']) {
            throw new \Exception("Invalid request or trial already started.");
        }

        try {
            DatabaseManager::beginTransaction();

            // 1. Get Salon ID
            $sql = "SELECT id FROM salons WHERE email = :email LIMIT 1";
            $salon = DatabaseManager::query($sql, ['email' => $request['email']])->fetch();
            if (!$salon) throw new \Exception("Salon not found.");

            // 2. Start Subscription Clock (14 days)
            $sql = "UPDATE subscriptions SET 
                    starts_at = NOW(), 
                    expires_at = DATE_ADD(NOW(), INTERVAL 14 DAY) 
                    WHERE salon_id = :salon_id AND status = 'trial' AND starts_at IS NULL";
            DatabaseManager::query($sql, ['salon_id' => $salon['id']]);

            // 3. Update Request
            $this->trialRepo->update($requestId, [
                'activation_started_at' => date('Y-m-d H:i:s')
            ]);

            DatabaseManager::commit();
            return true;
        } catch (\Exception $e) {
            DatabaseManager::rollBack();
            throw $e;
        }
    }

    public function rejectRequest(int $requestId, string $reason = ''): bool
    {
        $request = $this->trialRepo->find($requestId);
        if (!$request || $request['status'] !== 'pending') {
            throw new \Exception("Invalid or already processed request.");
        }

        return $this->trialRepo->update($requestId, [
            'status' => 'rejected',
            'rejection_reason' => $reason,
            'updated_at' => date('Y-m-d H:i:s')
        ]);
    }

    public function resendOtp(string $email): array
    {
        $request = $this->trialRepo->findByEmail($email);
        if (!$request) {
            throw new \Exception("No trial request found for this email.");
        }

        if ((int)($request['email_verified'] ?? 0) === 1) {
            throw new \Exception("This email has already been verified.");
        }

        $otp = (string) rand(100000, 999999);
        $this->trialRepo->update((int)$request['id'], ['verification_code' => $otp]);

        return ['email' => $email, 'otp' => $otp];
    }

    public function verifyEmail(string $email, string $otp): array
    {
        $request = $this->trialRepo->findByEmail($email);
        if (!$request) {
            throw new \Exception("Trial request not found.");
        }

        if ((int)($request['email_verified'] ?? 0) === 1) {
            throw new \Exception("Email has already been verified.");
        }

        if ($request['verification_code'] !== $otp) {
            throw new \Exception("Invalid verification code. Please try again.");
        }

        $this->trialRepo->update((int)$request['id'], [
            'email_verified' => 1,
            'verification_code' => null
        ]);

        return $request;
    }
}
