<?php

declare(strict_types=1);

namespace App\Services;

use App\Repositories\PromoCodeRepository;

class PromoCodeService extends BaseService
{
    private PromoCodeRepository $repo;

    public function __construct()
    {
        $this->repo = new PromoCodeRepository();
    }

    public function getAll(): array
    {
        return $this->repo->getAll();
    }

    public function create(array $data, int $adminId): int
    {
        $code = strtoupper(trim($data['code'] ?? ''));
        if ($code === '') {
            throw new \Exception('Promo code is required.');
        }
        if ($this->repo->findByCode($code)) {
            throw new \Exception('A promo code with this name already exists.');
        }

        $discount = (float)($data['discount_percent'] ?? 0);
        if ($discount <= 0 || $discount > 100) {
            throw new \Exception('Discount percent must be between 0 and 100.');
        }

        return $this->repo->create([
            'code' => $code,
            'discount_percent' => $discount,
            'duration_months' => !empty($data['duration_months']) ? (int)$data['duration_months'] : null,
            'valid_from' => !empty($data['valid_from']) ? date('Y-m-d H:i:s', strtotime($data['valid_from'])) : null,
            'valid_until' => !empty($data['valid_until']) ? date('Y-m-d H:i:s', strtotime($data['valid_until'])) : null,
            'max_redemptions' => !empty($data['max_redemptions']) ? (int)$data['max_redemptions'] : null,
            'is_active' => isset($data['is_active']) ? (int)(bool)$data['is_active'] : 1,
            'created_by' => $adminId ?: null,
        ]);
    }

    public function update(int $id, array $data): void
    {
        $existing = $this->repo->find($id);
        if (!$existing) {
            throw new \Exception('Promo code not found.');
        }

        $updates = [];

        if (array_key_exists('discount_percent', $data)) {
            $discount = (float)$data['discount_percent'];
            if ($discount <= 0 || $discount > 100) {
                throw new \Exception('Discount percent must be between 0 and 100.');
            }
            $updates['discount_percent'] = $discount;
        }
        if (array_key_exists('duration_months', $data)) {
            $updates['duration_months'] = $data['duration_months'] !== '' && $data['duration_months'] !== null
                ? (int)$data['duration_months'] : null;
        }
        if (array_key_exists('valid_from', $data)) {
            $updates['valid_from'] = !empty($data['valid_from']) ? date('Y-m-d H:i:s', strtotime($data['valid_from'])) : null;
        }
        if (array_key_exists('valid_until', $data)) {
            $updates['valid_until'] = !empty($data['valid_until']) ? date('Y-m-d H:i:s', strtotime($data['valid_until'])) : null;
        }
        if (array_key_exists('max_redemptions', $data)) {
            $updates['max_redemptions'] = $data['max_redemptions'] !== '' && $data['max_redemptions'] !== null
                ? (int)$data['max_redemptions'] : null;
        }
        if (array_key_exists('is_active', $data)) {
            $updates['is_active'] = (int)(bool)$data['is_active'];
        }

        if (empty($updates)) {
            return;
        }

        $this->repo->update($id, $updates);
    }

    public function delete(int $id): void
    {
        if (!$this->repo->find($id)) {
            throw new \Exception('Promo code not found.');
        }
        $this->repo->delete($id);
    }

    /**
     * Validate a code for redemption. Throws with a user-facing message on failure.
     * Returns the promo_codes row on success.
     */
    public function validateCode(string $code): array
    {
        $code = trim($code);
        if ($code === '') {
            throw new \Exception('Please enter a promo code.');
        }

        $promo = $this->repo->findByCode($code);
        if (!$promo) {
            throw new \Exception('Invalid promo code.');
        }
        if (!(bool)$promo['is_active']) {
            throw new \Exception('This promo code is no longer active.');
        }
        if ($promo['valid_from'] && strtotime($promo['valid_from']) > time()) {
            throw new \Exception('This promo code is not active yet.');
        }
        if ($promo['valid_until'] && strtotime($promo['valid_until']) < time()) {
            throw new \Exception('This promo code has expired.');
        }
        if ($promo['max_redemptions'] !== null && (int)$promo['times_redeemed'] >= (int)$promo['max_redemptions']) {
            throw new \Exception('This promo code has reached its redemption limit.');
        }

        return $promo;
    }

    public function redeem(int $id): void
    {
        $this->repo->incrementRedemptions($id);
    }
}
