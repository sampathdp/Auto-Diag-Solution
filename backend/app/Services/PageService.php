<?php

declare(strict_types=1);

namespace App\Services;

use App\Core\Arr;
use App\Exceptions\DomainException;
use App\Repositories\PageRepository;

class PageService
{
    private const BOOLEAN_FIELDS = ['is_published'];

    private PageRepository $repo;

    public function __construct()
    {
        $this->repo = new PageRepository();
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
        $page = $this->repo->find($id);
        if (!$page) {
            throw new DomainException('Page not found', 404);
        }
        return Arr::boolify($page, self::BOOLEAN_FIELDS);
    }

    // Public storefront lookup — published pages only, by slug. Kept separate from
    // find() so an unpublished/draft page never leaks to anonymous visitors.
    public function findPublishedBySlug(string $slug): array
    {
        $page = $this->repo->findBy('slug', $slug);
        if (!$page || !(bool)$page['is_published']) {
            throw new DomainException('Page not found', 404);
        }
        return Arr::boolify($page, self::BOOLEAN_FIELDS);
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
            throw new DomainException('Page not found', 404);
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
            throw new DomainException('Page not found', 404);
        }
        $this->repo->delete($id);
    }

    private function validate(array $input, ?int $excludeId): array
    {
        $data = [];
        $isCreate = $excludeId === null;

        if ($isCreate || array_key_exists('title_en', $input)) {
            $titleEn = trim((string)($input['title_en'] ?? ''));
            if ($titleEn === '') {
                throw new DomainException('English title is required', 422);
            }
            $data['title_en'] = $titleEn;
        }

        if ($isCreate || array_key_exists('title_ar', $input)) {
            $titleAr = trim((string)($input['title_ar'] ?? ''));
            if ($titleAr === '') {
                throw new DomainException('Arabic title is required', 422);
            }
            $data['title_ar'] = $titleAr;
        }

        foreach (['content_en', 'content_ar'] as $field) {
            if (array_key_exists($field, $input)) {
                $data[$field] = $input[$field] !== null ? (string)$input[$field] : null;
            }
        }

        if (array_key_exists('is_published', $input)) {
            $data['is_published'] = (int)(bool)$input['is_published'];
        }

        if (array_key_exists('slug', $input) && trim((string)$input['slug']) !== '') {
            $slug = slugify((string)$input['slug']);
        } elseif ($isCreate) {
            $slug = slugify($data['title_en']);
        } else {
            $slug = null;
        }

        if ($slug !== null) {
            if ($slug === '') {
                throw new DomainException('Could not derive a valid slug from the provided title', 422);
            }
            $conflict = $excludeId !== null
                ? $this->repo->existsExcluding('slug', $slug, $excludeId)
                : (bool) $this->repo->findBy('slug', $slug);
            if ($conflict) {
                throw new DomainException('A page with this slug already exists', 409);
            }
            $data['slug'] = $slug;
        }

        return $data;
    }
}
