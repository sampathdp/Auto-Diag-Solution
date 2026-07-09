<?php

declare(strict_types=1);

namespace App\Services;

use App\Core\Database\DatabaseManager;
use App\Exceptions\DomainException;
use App\Repositories\SeoMetaRepository;

class SeoMetaService
{
    private const VALID_PAGE_TYPES = ['page', 'category', 'product', 'custom'];

    // Which table a reference_id must exist in, keyed by page_type.
    private const REFERENCE_TABLES = [
        'page' => 'pages',
        'category' => 'categories',
        'product' => 'products',
    ];

    private SeoMetaRepository $repo;

    public function __construct()
    {
        $this->repo = new SeoMetaRepository();
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
        $entry = $this->repo->find($id);
        if (!$entry) {
            throw new DomainException('SEO entry not found', 404);
        }
        return $entry;
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
            throw new DomainException('SEO entry not found', 404);
        }
        $data = $this->validate($input, $id);
        if (!empty($data)) {
            $this->repo->update($id, $data);
        }
        return $this->find($id);
    }

    public function delete(int $id): void
    {
        if (!$this->repo->find($id)) {
            throw new DomainException('SEO entry not found', 404);
        }
        $this->repo->delete($id);
    }

    private function validate(array $input, ?int $excludeId): array
    {
        $data = [];
        $isCreate = $excludeId === null;

        $pageType = array_key_exists('page_type', $input) ? (string)$input['page_type'] : null;
        if ($isCreate || $pageType !== null) {
            $pageType ??= 'custom';
            if (!in_array($pageType, self::VALID_PAGE_TYPES, true)) {
                throw new DomainException('Invalid page_type', 422);
            }
            $data['page_type'] = $pageType;
        }

        if (array_key_exists('reference_id', $input)) {
            $data['reference_id'] = $input['reference_id'] !== null && $input['reference_id'] !== ''
                ? (int)$input['reference_id']
                : null;
        }

        $effectivePageType = $data['page_type'] ?? null;
        $effectiveReferenceId = array_key_exists('reference_id', $data) ? $data['reference_id'] : null;

        if ($effectivePageType !== null && isset(self::REFERENCE_TABLES[$effectivePageType])) {
            if ($effectiveReferenceId === null) {
                throw new DomainException("reference_id is required when page_type is '{$effectivePageType}'", 422);
            }
            $table = self::REFERENCE_TABLES[$effectivePageType];
            $exists = DatabaseManager::query("SELECT id FROM {$table} WHERE id = :id LIMIT 1", ['id' => $effectiveReferenceId])->fetch();
            if (!$exists) {
                throw new DomainException(ucfirst($effectivePageType) . ' not found for the given reference_id', 422);
            }
        }

        if ($isCreate || array_key_exists('path', $input)) {
            $path = trim((string)($input['path'] ?? ''));
            if ($path === '') {
                throw new DomainException('Path is required', 422);
            }
            $conflict = $excludeId !== null
                ? $this->repo->existsExcluding('path', $path, $excludeId)
                : (bool) $this->repo->findBy('path', $path);
            if ($conflict) {
                throw new DomainException('An SEO entry with this path already exists', 409);
            }
            $data['path'] = $path;
        }

        foreach (['meta_title_en', 'meta_title_ar', 'meta_description_en', 'meta_description_ar', 'og_image'] as $field) {
            if (array_key_exists($field, $input)) {
                $data[$field] = $input[$field] !== null ? (string)$input[$field] : null;
            }
        }

        return $data;
    }
}
