<?php

declare(strict_types=1);

namespace App\Services;

use App\Core\Arr;
use App\Exceptions\DomainException;
use App\Repositories\ShippingDistrictRepository;
use App\Repositories\ShippingRateRepository;

/**
 * Districts and rates are managed as separate entities (separate admin screens, separate
 * validate() paths below) even though a rate is meaningless without its district — mirrors
 * how the admin asked to add them "separately" rather than bundling a rate field onto the
 * district form.
 */
class ShippingService
{
    private const DISTRICT_BOOLEAN_FIELDS = ['is_active'];

    // Fallback used when an order's address has no district, or points at a district with
    // no rate configured yet — the flat fee that shipped before this feature existed.
    private const FALLBACK_FEE = 20.0;
    private const FALLBACK_FREE_THRESHOLD = 500.0;

    private ShippingDistrictRepository $districts;
    private ShippingRateRepository $rates;

    public function __construct()
    {
        $this->districts = new ShippingDistrictRepository();
        $this->rates = new ShippingRateRepository();
    }

    // --- Districts ---

    public function listDistricts(array $filters, string $search, string $sortBy, string $sortDir, int $page, int $perPage): array
    {
        return [
            'items' => array_map([$this, 'shapeDistrict'], $this->districts->paginate($filters, $search, $sortBy, $sortDir, $page, $perPage)),
            'total' => $this->districts->countFiltered($filters, $search),
        ];
    }

    public function findDistrict(int $id): array
    {
        $district = $this->districts->find($id);
        if (!$district) {
            throw new DomainException('Shipping district not found', 404);
        }
        $rate = $this->rates->findByDistrict($id);
        $shaped = $this->shapeDistrict(array_merge($district, [
            'rate' => $rate['rate'] ?? null,
            'free_shipping_threshold' => $rate['free_shipping_threshold'] ?? null,
        ]));
        $shaped['address_count'] = $this->districts->addressCount($id);
        return $shaped;
    }

    public function createDistrict(array $input): array
    {
        $data = $this->validateDistrict($input, null);
        $id = $this->districts->create($data);
        return $this->findDistrict($id);
    }

    public function updateDistrict(int $id, array $input): array
    {
        if (!$this->districts->find($id)) {
            throw new DomainException('Shipping district not found', 404);
        }
        $data = $this->validateDistrict($input, $id);
        if ($data) {
            $this->districts->update($id, $data);
        }
        return $this->findDistrict($id);
    }

    public function deleteDistrict(int $id): void
    {
        if (!$this->districts->find($id)) {
            throw new DomainException('Shipping district not found', 404);
        }
        // Not a hard block — addresses pointing here fall back to the flat rate
        // (customer_addresses.district_id is ON DELETE SET NULL) — but surfaced to the
        // admin so a delete on a busy district isn't a silent surprise.
        $this->districts->delete($id);
    }

    // --- Rates ---

    public function listRates(string $search, string $sortBy, string $sortDir, int $page, int $perPage): array
    {
        return [
            'items' => array_map([$this, 'shapeRate'], $this->rates->paginate($search, $sortBy, $sortDir, $page, $perPage)),
            'total' => $this->rates->countFiltered($search),
        ];
    }

    public function findRate(int $id): array
    {
        $rate = $this->rates->find($id);
        if (!$rate) {
            throw new DomainException('Shipping rate not found', 404);
        }
        $district = $this->districts->find((int)$rate['district_id']);
        return $this->shapeRate(array_merge($rate, ['district_name' => $district['name'] ?? null]));
    }

    public function createRate(array $input): array
    {
        $data = $this->validateRate($input, null);
        $id = $this->rates->create($data);
        return $this->findRate($id);
    }

    public function updateRate(int $id, array $input): array
    {
        if (!$this->rates->find($id)) {
            throw new DomainException('Shipping rate not found', 404);
        }
        $data = $this->validateRate($input, $id);
        if ($data) {
            $this->rates->update($id, $data);
        }
        return $this->findRate($id);
    }

    public function deleteRate(int $id): void
    {
        if (!$this->rates->find($id)) {
            throw new DomainException('Shipping rate not found', 404);
        }
        $this->rates->delete($id);
    }

    // --- Storefront ---

    /** Active districts + their rate (null if not yet priced) — feeds the address/checkout district picker. */
    public function publicDistricts(): array
    {
        return array_map(
            fn(array $row) => [
                'id' => (int)$row['id'],
                'name' => $row['name'],
                'rate' => $row['rate'] !== null ? (float)$row['rate'] : null,
                'free_shipping_threshold' => $row['free_shipping_threshold'] !== null ? (float)$row['free_shipping_threshold'] : null,
            ],
            $this->districts->activeWithRate()
        );
    }

    /** Used by CheckoutService — falls back to the flat fee when the address has no district or the district has no rate yet. */
    public function calculateShipping(?int $districtId, float $subtotal): float
    {
        $rate = $districtId !== null ? $this->rates->findByDistrict($districtId) : null;

        if ($rate) {
            $threshold = $rate['free_shipping_threshold'] !== null
                ? (float)$rate['free_shipping_threshold']
                : self::FALLBACK_FREE_THRESHOLD;
            return $subtotal > 0 && $subtotal < $threshold ? (float)$rate['rate'] : 0.0;
        }

        return $subtotal > 0 && $subtotal < self::FALLBACK_FREE_THRESHOLD ? self::FALLBACK_FEE : 0.0;
    }

    // --- Validation / shaping ---

    private function validateDistrict(array $input, ?int $excludeId): array
    {
        $data = [];
        $isCreate = $excludeId === null;

        if ($isCreate || array_key_exists('name', $input)) {
            $name = trim((string)($input['name'] ?? ''));
            if ($name === '') {
                throw new DomainException('District name is required', 422);
            }
            $conflict = $excludeId !== null
                ? $this->districts->existsExcluding('name', $name, $excludeId)
                : (bool) $this->districts->findBy('name', $name);
            if ($conflict) {
                throw new DomainException('A district with this name already exists', 409);
            }
            $data['name'] = $name;
        }

        if (array_key_exists('is_active', $input)) {
            $data['is_active'] = (int)(bool)$input['is_active'];
        } elseif ($isCreate) {
            $data['is_active'] = 1;
        }

        return $data;
    }

    private function validateRate(array $input, ?int $excludeId): array
    {
        $data = [];
        $isCreate = $excludeId === null;

        if ($isCreate) {
            $districtId = (int)($input['district_id'] ?? 0);
            if ($districtId <= 0) {
                throw new DomainException('A district is required', 422);
            }
            if (!$this->districts->find($districtId)) {
                throw new DomainException('Selected district does not exist', 422);
            }
            if ($this->rates->findByDistrict($districtId)) {
                throw new DomainException('This district already has a rate — edit it instead of adding another', 409);
            }
            $data['district_id'] = $districtId;
        }

        if ($isCreate || array_key_exists('rate', $input)) {
            if (!is_numeric($input['rate'] ?? null) || (float)$input['rate'] < 0) {
                throw new DomainException('Enter a valid, non-negative rate', 422);
            }
            $data['rate'] = round((float)$input['rate'], 2);
        }

        if (array_key_exists('free_shipping_threshold', $input)) {
            $threshold = $input['free_shipping_threshold'];
            if ($threshold === null || $threshold === '') {
                $data['free_shipping_threshold'] = null;
            } elseif (!is_numeric($threshold) || (float)$threshold < 0) {
                throw new DomainException('Free-shipping threshold must be a non-negative number', 422);
            } else {
                $data['free_shipping_threshold'] = round((float)$threshold, 2);
            }
        }

        return $data;
    }

    private function shapeDistrict(array $row): array
    {
        $shaped = Arr::boolify($row, self::DISTRICT_BOOLEAN_FIELDS);
        $shaped['id'] = (int)$shaped['id'];
        $shaped['rate'] = array_key_exists('rate', $shaped) && $shaped['rate'] !== null ? (float)$shaped['rate'] : null;
        $shaped['free_shipping_threshold'] = array_key_exists('free_shipping_threshold', $shaped) && $shaped['free_shipping_threshold'] !== null
            ? (float)$shaped['free_shipping_threshold']
            : null;
        return $shaped;
    }

    private function shapeRate(array $row): array
    {
        return [
            'id' => (int)$row['id'],
            'district_id' => (int)$row['district_id'],
            'district_name' => $row['district_name'] ?? null,
            'rate' => (float)$row['rate'],
            'free_shipping_threshold' => $row['free_shipping_threshold'] !== null ? (float)$row['free_shipping_threshold'] : null,
        ];
    }
}
