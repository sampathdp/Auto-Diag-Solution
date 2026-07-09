<?php

declare(strict_types=1);

namespace App\Services;

use App\Exceptions\DomainException;
use App\Repositories\VehicleRepository;

class VehicleService
{
    private const MIN_YEAR = 1980;

    private VehicleRepository $repo;

    public function __construct()
    {
        $this->repo = new VehicleRepository();
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
        $vehicle = $this->repo->find($id);
        if (!$vehicle) {
            throw new DomainException('Vehicle not found', 404);
        }
        $vehicle['products_count'] = $this->repo->productCount($id);
        return $vehicle;
    }

    public function filters(?int $year, ?string $make): array
    {
        return [
            'years' => $this->repo->distinctYears(),
            'makes' => $this->repo->distinctMakes($year),
            'models' => $this->repo->distinctModels($year, $make),
        ];
    }

    public function create(array $input): array
    {
        $data = $this->validate($input);
        if ($this->repo->existsCombo($data['year'], $data['make'], $data['model'])) {
            throw new DomainException('This year/make/model combination already exists', 409);
        }
        $id = $this->repo->create($data);
        return $this->find($id);
    }

    public function update(int $id, array $input): array
    {
        $existing = $this->repo->find($id);
        if (!$existing) {
            throw new DomainException('Vehicle not found', 404);
        }

        $data = $this->validate(array_merge(
            ['year' => $existing['year'], 'make' => $existing['make'], 'model' => $existing['model']],
            $input
        ));

        if ($this->repo->existsCombo($data['year'], $data['make'], $data['model'], $id)) {
            throw new DomainException('This year/make/model combination already exists', 409);
        }

        $this->repo->update($id, $data);
        return $this->find($id);
    }

    public function delete(int $id): void
    {
        if (!$this->repo->find($id)) {
            throw new DomainException('Vehicle not found', 404);
        }
        // product_vehicle rows CASCADE on vehicle delete — that's a deliberate fitment
        // mapping cleanup, not data loss, so no blocking guard here (unlike categories/brands).
        $this->repo->delete($id);
    }

    private function validate(array $input): array
    {
        $year = (int)($input['year'] ?? 0);
        $currentYearPlusTwo = (int)date('Y') + 2; // allow near-future model years
        if ($year < self::MIN_YEAR || $year > $currentYearPlusTwo) {
            throw new DomainException("Year must be between " . self::MIN_YEAR . " and {$currentYearPlusTwo}", 422);
        }

        $make = trim((string)($input['make'] ?? ''));
        if ($make === '') {
            throw new DomainException('Make is required', 422);
        }

        $model = trim((string)($input['model'] ?? ''));
        if ($model === '') {
            throw new DomainException('Model is required', 422);
        }

        return ['year' => $year, 'make' => $make, 'model' => $model];
    }
}
