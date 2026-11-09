<?php

declare(strict_types=1);

namespace App\Services;

use App\Core\Arr;
use App\Exceptions\DomainException;
use App\Repositories\PageRepository;

class PageService
{
    private const BOOLEAN_FIELDS = ['is_published'];

    // Slugs the storefront footer links to directly. Renaming or deleting them
    // breaks those links (404), so they are locked.
    // Footer slug => other slugs an admin may have used for the same page.
    private const SLUG_ALIASES = [
        'refund-policy' => ['refund-return-policy', 'return-policy', 'returns-policy', 'refund-and-return-policy'],
        'terms-and-conditions' => ['terms-conditions', 'terms', 'terms-of-service'],
        'privacy-policy' => ['privacy'],
    ];

    public const SYSTEM_SLUGS = ['terms-and-conditions', 'refund-policy', 'privacy-policy'];

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
        if (!$page) {
            foreach (self::SLUG_ALIASES[$slug] ?? [] as $alias) {
                $page = $this->repo->findBy('slug', $alias);
                if ($page) {
                    break;
                }
            }
        }
        if (!$page || !(bool)$page['is_published']) {
            throw new DomainException('Page not found', 404);
        }
        return Arr::boolify($page, self::BOOLEAN_FIELDS);
    }

    // Footer legal links: for each system page, the live slug + titles (published only).
    public function footerPages(): array
    {
        $map = ['terms' => 'terms-and-conditions', 'refund' => 'refund-policy', 'privacy' => 'privacy-policy'];
        $out = [];
        foreach ($map as $key => $slug) {
            try {
                $p = $this->findPublishedBySlug($slug);
                $out[$key] = ['slug' => $p['slug'], 'title_en' => $p['title_en'], 'title_ar' => $p['title_ar']];
            } catch (DomainException $e) {
                // unpublished/missing: footer keeps its built-in label and link
            }
        }
        return $out;
    }

    public function create(array $input): array
    {
        $data = $this->validate($input, null);
        $id = $this->repo->create($data);
        return $this->find($id);
    }

    public function update(int $id, array $input): array
    {
        $existing = $this->repo->find($id);
        if (!$existing) {
            throw new DomainException('Page not found', 404);
        }
        if (in_array($existing['slug'], self::SYSTEM_SLUGS, true)) {
            unset($input['slug']);
        }
        $data = $this->validate($input, $id);
        if (!empty($data)) {
            $this->repo->update($id, $data);
        }
        return $this->find($id);
    }

    public function delete(int $id): void
    {
        $existing = $this->repo->find($id);
        if (!$existing) {
            throw new DomainException('Page not found', 404);
        }
        if (in_array($existing['slug'], self::SYSTEM_SLUGS, true)) {
            throw new DomainException('This page is linked from the storefront and cannot be deleted', 422);
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
