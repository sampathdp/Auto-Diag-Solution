<?php

declare(strict_types=1);

namespace App\Services;

use App\Exceptions\DomainException;
use App\Repositories\SalesRepRepository;

class SalesRepService
{
    private const COMMISSION_TYPES = ['percentage', 'fixed_amount'];
    private const STATUSES = ['active', 'inactive'];

    private SalesRepRepository $repo;

    public function __construct()
    {
        $this->repo = new SalesRepRepository();
    }

    public function list(array $filters, string $search, string $sortBy, string $sortDir, int $page, int $perPage): array
    {
        $items = array_map([$this, 'shape'], $this->repo->paginate($filters, $search, $sortBy, $sortDir, $page, $perPage));
        return [
            'items' => $items,
            'total' => $this->repo->countFiltered($filters, $search),
        ];
    }

    public function find(int $id): array
    {
        $rep = $this->repo->find($id);
        if (!$rep) {
            throw new DomainException('Sales representative not found', 404);
        }
        $rep = $this->shape($rep);
        $rep['stats'] = $this->repo->stats($id);
        return $rep;
    }

    private function shape(array $rep): array
    {
        $rep['id'] = (int)$rep['id'];
        $rep['commission_value'] = (float)$rep['commission_value'];
        return $rep;
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
            throw new DomainException('Sales representative not found', 404);
        }
        $data = $this->validate($input, $id);
        if ($data) {
            $this->repo->update($id, $data);
        }
        return $this->find($id);
    }

    /**
     * Hard delete only if nothing references this rep (no promo codes, no orders ever
     * attributed to them) — otherwise deactivate instead, per the master spec's
     * "delete if no dependent records, otherwise archive/deactivate" rule.
     */
    public function delete(int $id): void
    {
        if (!$this->repo->find($id)) {
            throw new DomainException('Sales representative not found', 404);
        }
        if ($this->repo->promoCodeCount($id) > 0 || $this->repo->orderCount($id) > 0) {
            throw new DomainException(
                'This representative has promo codes or orders on record and cannot be deleted — deactivate them instead',
                409
            );
        }
        $this->repo->delete($id);
    }

    private function validate(array $input, ?int $excludeId): array
    {
        $data = [];
        $isCreate = $excludeId === null;

        if ($isCreate || array_key_exists('name', $input)) {
            $name = trim((string)($input['name'] ?? ''));
            if ($name === '') {
                throw new DomainException('Name is required', 422);
            }
            $data['name'] = $name;
        }

        if ($isCreate || array_key_exists('email', $input)) {
            $email = strtolower(trim((string)($input['email'] ?? '')));
            if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
                throw new DomainException('A valid email address is required', 422);
            }
            $conflict = $excludeId !== null
                ? $this->repo->existsExcluding('email', $email, $excludeId)
                : (bool) $this->repo->findBy('email', $email);
            if ($conflict) {
                throw new DomainException('A sales representative with this email already exists', 409);
            }
            $data['email'] = $email;
        }

        if (array_key_exists('phone', $input)) {
            $data['phone'] = $input['phone'] !== null ? trim((string)$input['phone']) : null;
        }
        if (array_key_exists('address', $input)) {
            $data['address'] = $input['address'] !== null ? trim((string)$input['address']) : null;
        }

        if (array_key_exists('status', $input)) {
            $status = (string)$input['status'];
            if (!in_array($status, self::STATUSES, true)) {
                throw new DomainException('Invalid status', 422);
            }
            $data['status'] = $status;
        }

        if ($isCreate || array_key_exists('commission_type', $input)) {
            $type = (string)($input['commission_type'] ?? 'percentage');
            if (!in_array($type, self::COMMISSION_TYPES, true)) {
                throw new DomainException('Invalid commission type', 422);
            }
            $data['commission_type'] = $type;
        }

        if ($isCreate || array_key_exists('commission_value', $input)) {
            $value = (float)($input['commission_value'] ?? 0);
            $effectiveType = $data['commission_type'] ?? ($this->repo->find($excludeId ?? 0)['commission_type'] ?? 'percentage');
            $this->assertValidRate($value, $effectiveType);
            $data['commission_value'] = $value;
        }

        return $data;
    }

    private function assertValidRate(float $value, string $type): void
    {
        if ($value < 0) {
            throw new DomainException('Commission value cannot be negative', 422);
        }
        if ($type === 'percentage' && $value > 100) {
            throw new DomainException('A percentage commission cannot exceed 100', 422);
        }
    }
}
