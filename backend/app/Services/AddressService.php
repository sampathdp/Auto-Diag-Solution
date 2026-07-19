<?php

declare(strict_types=1);

namespace App\Services;

use App\Exceptions\DomainException;
use App\Repositories\AddressRepository;

class AddressService
{
    private AddressRepository $repo;

    public function __construct()
    {
        $this->repo = new AddressRepository();
    }

    public function list(int $userId): array
    {
        return array_map([$this, 'shape'], $this->repo->forUser($userId));
    }

    /** Used by checkout to validate ownership and snapshot the address onto the order. */
    public function find(int $userId, int $id): array
    {
        $row = $this->repo->findForUser($id, $userId);
        if (!$row) {
            throw new DomainException('Shipping address not found', 404);
        }
        return $this->shape($row);
    }

    public function create(int $userId, array $input): array
    {
        $fields = $this->mapInput($input);
        $makeDefault = $this->repo->countForUser($userId) === 0 || !empty($input['is_default']);

        if ($makeDefault) {
            $this->repo->clearDefaultForUser($userId);
        }

        $id = $this->repo->create(array_merge($fields, [
            'user_id' => $userId,
            'is_default' => $makeDefault ? 1 : 0,
        ]));

        return $this->shape($this->repo->find($id));
    }

    public function update(int $userId, int $id, array $input): array
    {
        $existing = $this->repo->findForUser($id, $userId);
        if (!$existing) {
            throw new DomainException('Address not found', 404);
        }

        $fields = $this->mapInput($input);

        if (!empty($input['is_default']) && !$existing['is_default']) {
            $this->repo->clearDefaultForUser($userId);
            $fields['is_default'] = 1;
        }

        $this->repo->update($id, $fields);
        return $this->shape($this->repo->find($id));
    }

    public function delete(int $userId, int $id): void
    {
        $existing = $this->repo->findForUser($id, $userId);
        if (!$existing) {
            throw new DomainException('Address not found', 404);
        }
        if ($existing['is_default'] && $this->repo->countForUser($userId) > 1) {
            throw new DomainException('Cannot delete the default address. Set another address as default first.', 409);
        }
        $this->repo->delete($id);
    }

    public function setDefault(int $userId, int $id): void
    {
        $existing = $this->repo->findForUser($id, $userId);
        if (!$existing) {
            throw new DomainException('Address not found', 404);
        }
        $this->repo->clearDefaultForUser($userId);
        $this->repo->update($id, ['is_default' => 1]);
    }

    private function mapInput(array $input): array
    {
        $emirate = (string)($input['emirate'] ?? 'Dubai');
        $label = trim((string)($input['label'] ?? ''));
        $name = trim((string)($input['name'] ?? ''));
        $phone = trim((string)($input['phone'] ?? ''));
        $area = trim((string)($input['area'] ?? ''));
        $building = trim((string)($input['building'] ?? ''));

        if ($name === '' || $phone === '' || $area === '' || $building === '') {
            throw new DomainException('Name, phone, area, and building are required', 422);
        }

        return [
            'label' => $label !== '' ? $label : 'Home',
            'full_name' => $name,
            'phone' => $phone,
            'emirate' => $emirate,
            'city' => $emirate,
            'area' => $area,
            'street_address' => trim((string)($input['street'] ?? '')),
            'building' => $building,
            'apartment' => trim((string)($input['apartment'] ?? '')) ?: null,
            'delivery_instructions' => trim((string)($input['instructions'] ?? '')) ?: null,
        ];
    }

    private function shape(array $row): array
    {
        return [
            'id' => (int)$row['id'],
            'label' => $row['label'],
            'name' => $row['full_name'],
            'phone' => $row['phone'],
            'emirate' => $row['emirate'],
            'city' => $row['city'],
            'area' => $row['area'],
            'street' => $row['street_address'],
            'building' => $row['building'],
            'apartment' => $row['apartment'],
            'instructions' => $row['delivery_instructions'],
            'is_default' => (bool)$row['is_default'],
        ];
    }
}
