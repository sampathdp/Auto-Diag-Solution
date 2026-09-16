<?php

declare(strict_types=1);

namespace App\Services;

use App\Exceptions\DomainException;
use App\Repositories\PromoCodeRepository;
use App\Repositories\SalesRepRepository;

/**
 * All discount/commission math lives here so both the public checkout-validation path
 * and the actual order-placement path (CheckoutService) call the exact same code —
 * the frontend never gets to supply a discount/commission amount, only a code string.
 */
class PromoCodeService
{
    private const DISCOUNT_TYPES = ['percentage', 'fixed_amount'];
    private const COMMISSION_BASES = ['original_subtotal', 'discounted_subtotal', 'final_total'];
    private const STATUSES = ['active', 'inactive'];

    private PromoCodeRepository $repo;
    private SalesRepRepository $salesReps;

    public function __construct()
    {
        $this->repo = new PromoCodeRepository();
        $this->salesReps = new SalesRepRepository();
    }

    public function list(array $filters, string $search, string $sortBy, string $sortDir, int $page, int $perPage): array
    {
        return [
            'items' => $this->repo->paginate($filters, $search, $sortBy, $sortDir, $page, $perPage),
            'total' => $this->repo->countFiltered($filters, $search),
        ];
    }

    public function find(int $id): array
    {
        $promo = $this->repo->find($id);
        if (!$promo) {
            throw new DomainException('Promo code not found', 404);
        }
        $promo['sales_rep'] = $this->salesReps->find((int)$promo['sales_rep_id']);
        $promo['stats'] = $this->repo->stats($id);
        return $promo;
    }

    public function report(int $id, int $page, int $perPage): array
    {
        $promo = $this->find($id);
        $promo['orders'] = $this->repo->ordersForCode($id, $page, $perPage);
        return $promo;
    }

    public function create(array $input): array
    {
        $data = $this->validate($input, null);
        $id = $this->repo->create($data);
        return $this->find($id);
    }

    public function update(int $id, array $input): array
    {
        if (!$this->repo->find($id)) {
            throw new DomainException('Promo code not found', 404);
        }
        $data = $this->validate($input, $id);
        if ($data) {
            $this->repo->update($id, $data);
        }
        return $this->find($id);
    }

    /** Hard delete only if the code has never been used on a real order. */
    public function delete(int $id): void
    {
        if (!$this->repo->find($id)) {
            throw new DomainException('Promo code not found', 404);
        }
        if ($this->repo->orderCount($id) > 0) {
            throw new DomainException(
                'This promo code has been used on real orders and cannot be deleted — deactivate it instead',
                409
            );
        }
        $this->repo->delete($id);
    }

    /**
     * The single source of truth for "is this code usable against this cart right now".
     * Called by both POST /promo-codes/validate (checkout preview) and CheckoutService
     * (order placement) — never trust a discount/sales-rep-id the frontend sends back.
     *
     * @return array{promo: array, sales_rep: array, discount_amount: float}
     */
    public function validateForCheckout(string $code, float $subtotal): array
    {
        $code = strtoupper(trim($code));
        if ($code === '') {
            throw new DomainException('Promo code is required', 422);
        }

        $promo = $this->repo->findByCode($code);
        if (!$promo) {
            throw new DomainException('Invalid promo code', 404);
        }
        if ($promo['status'] !== 'active') {
            throw new DomainException('This promo code is no longer active', 422);
        }

        $today = date('Y-m-d');
        if (!empty($promo['start_date']) && $today < $promo['start_date']) {
            throw new DomainException('This promo code is not active yet', 422);
        }
        if (!empty($promo['expiry_date']) && $today > $promo['expiry_date']) {
            throw new DomainException('This promo code has expired', 422);
        }
        if ($promo['usage_limit'] !== null && (int)$promo['used_count'] >= (int)$promo['usage_limit']) {
            throw new DomainException('This promo code has reached its usage limit', 422);
        }
        if ($subtotal < (float)$promo['minimum_order_amount']) {
            throw new DomainException(
                'A minimum order amount of ' . number_format((float)$promo['minimum_order_amount'], 2) . ' is required for this promo code',
                422
            );
        }

        $salesRep = $this->salesReps->find((int)$promo['sales_rep_id']);
        if (!$salesRep || $salesRep['status'] !== 'active') {
            throw new DomainException('This promo code is currently unavailable', 422);
        }

        return [
            'promo' => $promo,
            'sales_rep' => $salesRep,
            'discount_amount' => $this->calculateDiscount($promo, $subtotal),
        ];
    }

    public function calculateDiscount(array $promo, float $subtotal): float
    {
        $amount = $promo['discount_type'] === 'percentage'
            ? $subtotal * ((float)$promo['discount_value'] / 100)
            : (float)$promo['discount_value'];

        if ($promo['maximum_discount_amount'] !== null) {
            $amount = min($amount, (float)$promo['maximum_discount_amount']);
        }
        // Never discount more than the order is actually worth.
        $amount = min($amount, $subtotal);

        return round(max($amount, 0), 2);
    }

    /** Which of the three base amounts this promo code is configured to pay commission on. */
    public function resolveCommissionBaseAmount(array $promo, float $originalSubtotal, float $discountedSubtotal, float $finalTotal): float
    {
        return match ($promo['commission_base']) {
            'original_subtotal' => $originalSubtotal,
            'final_total' => $finalTotal,
            default => $discountedSubtotal,
        };
    }

    public function calculateCommission(array $promo, float $baseAmount): float
    {
        $amount = $promo['commission_type'] === 'percentage'
            ? $baseAmount * ((float)$promo['commission_value'] / 100)
            : (float)$promo['commission_value'];

        return round(max($amount, 0), 2);
    }

    /** Atomically consumes one use — returns false if the limit was hit in the meantime (caller must abort the order). */
    public function consumeUsage(int $id): bool
    {
        return $this->repo->incrementUsage($id);
    }

    private function validate(array $input, ?int $excludeId): array
    {
        $data = [];
        $isCreate = $excludeId === null;

        if ($isCreate || array_key_exists('code', $input)) {
            $code = strtoupper(trim((string)($input['code'] ?? '')));
            if ($code === '') {
                throw new DomainException('Code is required', 422);
            }
            $conflict = $excludeId !== null
                ? $this->repo->existsExcluding('code', $code, $excludeId)
                : (bool) $this->repo->findByCode($code);
            if ($conflict) {
                throw new DomainException('A promo code with this code already exists', 409);
            }
            $data['code'] = $code;
        }

        if (array_key_exists('description', $input)) {
            $data['description'] = $input['description'] !== null ? trim((string)$input['description']) : null;
        }

        if ($isCreate || array_key_exists('sales_rep_id', $input)) {
            $salesRepId = (int)($input['sales_rep_id'] ?? 0);
            if ($salesRepId <= 0 || !$this->salesReps->find($salesRepId)) {
                throw new DomainException('A valid sales representative must be assigned to this promo code', 422);
            }
            $data['sales_rep_id'] = $salesRepId;
        }

        if ($isCreate || array_key_exists('discount_type', $input)) {
            $type = (string)($input['discount_type'] ?? 'percentage');
            if (!in_array($type, self::DISCOUNT_TYPES, true)) {
                throw new DomainException('Invalid discount type', 422);
            }
            $data['discount_type'] = $type;
        }
        if ($isCreate || array_key_exists('discount_value', $input)) {
            $value = (float)($input['discount_value'] ?? 0);
            $type = $data['discount_type'] ?? ($isCreate ? 'percentage' : $this->repo->find($excludeId)['discount_type']);
            $this->assertValidRate($value, $type, 'Discount');
            $data['discount_value'] = $value;
        }

        if ($isCreate || array_key_exists('commission_type', $input)) {
            $type = (string)($input['commission_type'] ?? 'percentage');
            if (!in_array($type, self::DISCOUNT_TYPES, true)) {
                throw new DomainException('Invalid commission type', 422);
            }
            $data['commission_type'] = $type;
        }
        if ($isCreate || array_key_exists('commission_value', $input)) {
            $value = (float)($input['commission_value'] ?? 0);
            $type = $data['commission_type'] ?? ($isCreate ? 'percentage' : $this->repo->find($excludeId)['commission_type']);
            $this->assertValidRate($value, $type, 'Commission');
            $data['commission_value'] = $value;
        }

        if (array_key_exists('commission_base', $input)) {
            $base = (string)$input['commission_base'];
            if (!in_array($base, self::COMMISSION_BASES, true)) {
                throw new DomainException('Invalid commission calculation base', 422);
            }
            $data['commission_base'] = $base;
        }

        if (array_key_exists('minimum_order_amount', $input)) {
            $data['minimum_order_amount'] = max(0, (float)$input['minimum_order_amount']);
        }
        if (array_key_exists('maximum_discount_amount', $input)) {
            $data['maximum_discount_amount'] = $input['maximum_discount_amount'] !== null && $input['maximum_discount_amount'] !== ''
                ? max(0, (float)$input['maximum_discount_amount'])
                : null;
        }
        if (array_key_exists('usage_limit', $input)) {
            $data['usage_limit'] = $input['usage_limit'] !== null && $input['usage_limit'] !== ''
                ? max(1, (int)$input['usage_limit'])
                : null;
        }
        if (array_key_exists('start_date', $input)) {
            $data['start_date'] = $input['start_date'] !== null && $input['start_date'] !== '' ? (string)$input['start_date'] : null;
        }
        if (array_key_exists('expiry_date', $input)) {
            $data['expiry_date'] = $input['expiry_date'] !== null && $input['expiry_date'] !== '' ? (string)$input['expiry_date'] : null;
        }
        if (isset($data['start_date'], $data['expiry_date']) && $data['start_date'] !== null && $data['expiry_date'] !== null) {
            if ($data['start_date'] > $data['expiry_date']) {
                throw new DomainException('Start date must be before the expiry date', 422);
            }
        }

        if (array_key_exists('status', $input)) {
            $status = (string)$input['status'];
            if (!in_array($status, self::STATUSES, true)) {
                throw new DomainException('Invalid status', 422);
            }
            $data['status'] = $status;
        }

        return $data;
    }

    private function assertValidRate(float $value, string $type, string $label): void
    {
        if ($value < 0) {
            throw new DomainException("{$label} value cannot be negative", 422);
        }
        if ($type === 'percentage' && $value > 100) {
            throw new DomainException("A percentage {$label} cannot exceed 100", 422);
        }
    }
}
