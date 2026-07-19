<?php

declare(strict_types=1);

namespace App\Services;

use App\Exceptions\DomainException;
use App\Repositories\CustomerVehicleRepository;

class CustomerVehicleService
{
    private const MAX_VEHICLES = 5;

    private CustomerVehicleRepository $repo;

    public function __construct()
    {
        $this->repo = new CustomerVehicleRepository();
    }

    public function list(int $userId): array
    {
        return array_map([$this, 'shape'], $this->repo->forUser($userId));
    }

    public function create(int $userId, array $input): array
    {
        if ($this->repo->countForUser($userId) >= self::MAX_VEHICLES) {
            throw new DomainException('You can only have up to 5 vehicles saved.', 422);
        }

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
            throw new DomainException('Vehicle not found', 404);
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
            throw new DomainException('Vehicle not found', 404);
        }
        $this->repo->delete($id);

        // Promote the oldest remaining vehicle to default if we just removed the default one.
        if ($existing['is_default']) {
            $remaining = $this->repo->forUser($userId);
            if ($remaining) {
                $this->repo->update((int)$remaining[0]['id'], ['is_default' => 1]);
            }
        }
    }

    public function setDefault(int $userId, int $id): void
    {
        $existing = $this->repo->findForUser($id, $userId);
        if (!$existing) {
            throw new DomainException('Vehicle not found', 404);
        }
        $this->repo->clearDefaultForUser($userId);
        $this->repo->update($id, ['is_default' => 1]);
    }

    private function mapInput(array $input): array
    {
        $year = (int)($input['year'] ?? 0);
        $make = trim((string)($input['make'] ?? ''));
        $model = trim((string)($input['model'] ?? ''));

        if ($year < 1980 || $make === '' || $model === '') {
            throw new DomainException('Year, make, and model are required', 422);
        }

        return [
            'year' => $year,
            'make' => $make,
            'model' => $model,
            'trim' => trim((string)($input['trim'] ?? '')) ?: null,
            'body_type' => trim((string)($input['body_type'] ?? '')) ?: null,
            'engine' => trim((string)($input['engine'] ?? '')) ?: null,
            'fuel_type' => trim((string)($input['fuel_type'] ?? '')) ?: null,
            'transmission' => trim((string)($input['transmission'] ?? '')) ?: null,
            'drive_type' => trim((string)($input['drive_type'] ?? '')) ?: null,
            'color' => trim((string)($input['color'] ?? '')) ?: null,
            'vin' => trim((string)($input['vin'] ?? '')) ?: null,
            'license_plate' => trim((string)($input['license_plate'] ?? '')) ?: null,
            'mileage' => !empty($input['mileage']) ? (int)$input['mileage'] : null,
            'nickname' => trim((string)($input['nickname'] ?? '')) ?: null,
            'purchase_date' => !empty($input['purchase_date']) ? (string)$input['purchase_date'] : null,
        ];
    }

    private function shape(array $row): array
    {
        return [
            'id' => (int)$row['id'],
            'year' => (int)$row['year'],
            'make' => $row['make'],
            'model' => $row['model'],
            'trim' => $row['trim'],
            'body_type' => $row['body_type'],
            'engine' => $row['engine'],
            'fuel_type' => $row['fuel_type'],
            'transmission' => $row['transmission'],
            'drive_type' => $row['drive_type'],
            'color' => $row['color'],
            'vin' => $row['vin'],
            'license_plate' => $row['license_plate'],
            'mileage' => $row['mileage'] !== null ? (int)$row['mileage'] : null,
            'nickname' => $row['nickname'],
            'purchase_date' => $row['purchase_date'],
            'is_default' => (bool)$row['is_default'],
        ];
    }
}
