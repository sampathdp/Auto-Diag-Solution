<?php

declare(strict_types=1);

namespace App\Services;

use App\Exceptions\DomainException;
use App\Repositories\VehicleRepository;

class VehicleService
{
    private const MIN_YEAR = 1980;
    // A fat-fingered "year to" (e.g. 2100 instead of 2018) shouldn't silently create
    // decades of rows — caps a single bulk-add call to a generous but bounded span.
    private const MAX_BULK_YEARS = 60;

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
        if ($this->repo->existsCombo($data['year'], $data['make'], $data['model'], $data['chassis_code'])) {
            throw new DomainException('This year/make/model/chassis combination already exists', 409);
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
            [
                'year' => $existing['year'],
                'make' => $existing['make'],
                'model' => $existing['model'],
                'chassis_code' => $existing['chassis_code'],
            ],
            $input
        ));

        if ($this->repo->existsCombo($data['year'], $data['make'], $data['model'], $data['chassis_code'], $id)) {
            throw new DomainException('This year/make/model/chassis combination already exists', 409);
        }

        $this->repo->update($id, $data);
        return $this->find($id);
    }

    /**
     * Bulk/Range add — one make+model+chassis (e.g. "Nissan Altima L32") entered once
     * against a year span expands into one `vehicles` row per year. Existing combos in
     * the range are skipped (not an error) so re-running the same range is safe, and
     * the two-step "L32 then L33" flow the admin form drives naturally overlaps years
     * (2013 in both) without either call clobbering the other, since chassis_code is
     * part of the dedup key.
     *
     * @return array{created: int[], skipped: int[]}
     */
    public function bulkCreate(array $input): array
    {
        $make = trim((string)($input['make'] ?? ''));
        if ($make === '') {
            throw new DomainException('Make is required', 422);
        }
        $model = trim((string)($input['model'] ?? ''));
        if ($model === '') {
            throw new DomainException('Model is required', 422);
        }
        $chassisCode = $this->normalizeChassisCode($input['chassis_code'] ?? null);

        $currentYearPlusTwo = (int)date('Y') + 2;
        $yearFrom = (int)($input['year_from'] ?? 0);
        $yearTo = (int)($input['year_to'] ?? 0);
        if ($yearFrom < self::MIN_YEAR || $yearFrom > $currentYearPlusTwo || $yearTo < self::MIN_YEAR || $yearTo > $currentYearPlusTwo) {
            throw new DomainException("Year must be between " . self::MIN_YEAR . " and {$currentYearPlusTwo}", 422);
        }
        if ($yearTo < $yearFrom) {
            throw new DomainException('"Year to" cannot be before "Year from"', 422);
        }
        if ($yearTo - $yearFrom + 1 > self::MAX_BULK_YEARS) {
            throw new DomainException('That year range is too large for one bulk add (max ' . self::MAX_BULK_YEARS . ' years)', 422);
        }

        $created = [];
        $skipped = [];
        for ($year = $yearFrom; $year <= $yearTo; $year++) {
            if ($this->repo->existsCombo($year, $make, $model, $chassisCode)) {
                $skipped[] = $year;
                continue;
            }
            $this->repo->create(['year' => $year, 'make' => $make, 'model' => $model, 'chassis_code' => $chassisCode]);
            $created[] = $year;
        }

        return ['created' => $created, 'skipped' => $skipped];
    }

    public function delete(int $id): void
    {
        if (!$this->repo->find($id)) {
            throw new DomainException('Vehicle not found', 404);
        }
        // Product fitment no longer links to this catalog by id (see product_fitments,
        // which stores make/model/year range freeform) — deleting a vehicle row here has
        // no cascading effect on products, so no blocking guard is needed.
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

        return ['year' => $year, 'make' => $make, 'model' => $model, 'chassis_code' => $this->normalizeChassisCode($input['chassis_code'] ?? null)];
    }

    private function normalizeChassisCode(mixed $value): ?string
    {
        $trimmed = trim((string)($value ?? ''));
        return $trimmed !== '' ? $trimmed : null;
    }
}
