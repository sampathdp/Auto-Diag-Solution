<?php

declare(strict_types=1);

namespace App\Services;

use App\Core\Arr;
use App\Exceptions\DomainException;
use App\Repositories\CategoryRepository;

class CategoryService
{
    private const BOOLEAN_FIELDS = ['is_active'];

    private CategoryRepository $repo;

    public function __construct()
    {
        $this->repo = new CategoryRepository();
    }

    public function list(array $filters, string $search, string $sortBy, string $sortDir, int $page, int $perPage): array
    {
        return [
            'items' => Arr::boolifyMany(
                $this->repo->paginate($filters, $search, $sortBy, $sortDir, $page, $perPage),
                self::BOOLEAN_FIELDS
            ),
            'total' => $this->repo->countFiltered($filters, $search),
        ];
    }

    public function find(int $id): array
    {
        $category = $this->repo->find($id);
        if (!$category) {
            throw new DomainException('Category not found', 404);
        }
        $category = Arr::boolify($category, self::BOOLEAN_FIELDS);
        $category['products_count'] = $this->repo->productCount($id);
        return $category;
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
            throw new DomainException('Category not found', 404);
        }

        $data = $this->validate($input, $id);

        if (array_key_exists('parent_id', $data) && $data['parent_id'] !== null) {
            if ($this->repo->wouldCreateCycle($id, (int) $data['parent_id'])) {
                throw new DomainException('A category cannot be moved under its own descendant', 422);
            }
        }

        $this->repo->update($id, $data);
        return $this->find($id);
    }

    public function delete(int $id): void
    {
        if (!$this->repo->find($id)) {
            throw new DomainException('Category not found', 404);
        }

        if ($this->repo->hasChildren($id)) {
            throw new DomainException('Cannot delete a category that has subcategories — move or delete them first', 409);
        }

        if ($this->repo->productCount($id) > 0) {
            throw new DomainException('Cannot delete a category that still has products assigned — reassign them first', 409);
        }

        $this->repo->delete($id);
    }

    /**
     * Explicit whitelist + validation. $excludeId is the category being updated
     * (so its own slug/parent don't trip the "already taken"/"self-parent" checks).
     */
    private function validate(array $input, ?int $excludeId): array
    {
        $data = [];

        $isCreate = $excludeId === null;

        if ($isCreate || array_key_exists('name_en', $input)) {
            $nameEn = trim((string)($input['name_en'] ?? ''));
            if ($nameEn === '') {
                throw new DomainException('English name is required', 422);
            }
            $data['name_en'] = $nameEn;
        }

        if ($isCreate || array_key_exists('name_ar', $input)) {
            $nameAr = trim((string)($input['name_ar'] ?? ''));
            if ($nameAr === '') {
                throw new DomainException('Arabic name is required', 422);
            }
            $data['name_ar'] = $nameAr;
        }

        if (array_key_exists('description_en', $input)) {
            $data['description_en'] = $input['description_en'] !== null ? (string)$input['description_en'] : null;
        }
        if (array_key_exists('description_ar', $input)) {
            $data['description_ar'] = $input['description_ar'] !== null ? (string)$input['description_ar'] : null;
        }
        if (array_key_exists('image', $input)) {
            $data['image'] = $input['image'] !== null ? (string)$input['image'] : null;
        }
        if (array_key_exists('sort_order', $input)) {
            $data['sort_order'] = (int)$input['sort_order'];
        }
        if (array_key_exists('is_active', $input)) {
            $data['is_active'] = (int)(bool)$input['is_active'];
        }

        if (array_key_exists('parent_id', $input)) {
            $parentId = $input['parent_id'] !== null && $input['parent_id'] !== '' ? (int)$input['parent_id'] : null;
            if ($parentId !== null) {
                if ($excludeId !== null && $parentId === $excludeId) {
                    throw new DomainException('A category cannot be its own parent', 422);
                }
                if (!$this->repo->find($parentId)) {
                    throw new DomainException('Parent category not found', 422);
                }
            }
            $data['parent_id'] = $parentId;
        }

        // Slug: explicit if provided, otherwise derived from name_en on create only
        // (an update that doesn't touch name_en/slug keeps the existing slug).
        if (array_key_exists('slug', $input) && trim((string)$input['slug']) !== '') {
            $slug = slugify((string)$input['slug']);
        } elseif ($isCreate) {
            $slug = slugify($data['name_en']);
        } else {
            $slug = null;
        }

        if ($slug !== null) {
            if ($slug === '') {
                throw new DomainException('Could not derive a valid slug from the provided name', 422);
            }
            $conflict = $excludeId !== null
                ? $this->repo->existsExcluding('slug', $slug, $excludeId)
                : (bool) $this->repo->findBy('slug', $slug);
            if ($conflict) {
                throw new DomainException('A category with this slug already exists', 409);
            }
            $data['slug'] = $slug;
        }

        return $data;
    }
}
