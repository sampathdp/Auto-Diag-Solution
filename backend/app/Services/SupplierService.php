<?php

declare(strict_types=1);

namespace App\Services;

use App\Core\Encryption;
use App\Exceptions\DomainException;
use App\Repositories\SupplierRepository;

class SupplierService
{
    private const VALID_STATUS = ['active', 'inactive'];

    private SupplierRepository $repo;

    public function __construct()
    {
        $this->repo = new SupplierRepository();
    }

    public function list(array $filters, string $search, string $sortBy, string $sortDir, int $page, int $perPage): array
    {
        $items = $this->repo->paginate($filters, $search, $sortBy, $sortDir, $page, $perPage);
        return [
            'items' => array_map([$this, 'sanitize'], $items),
            'total' => $this->repo->countFiltered($filters, $search),
        ];
    }

    public function find(int $id): array
    {
        $supplier = $this->repo->find($id);
        if (!$supplier) {
            throw new DomainException('Supplier not found', 404);
        }
        $supplier = $this->sanitize($supplier);
        $supplier['products_count'] = $this->repo->productCount($id);
        return $supplier;
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
            throw new DomainException('Supplier not found', 404);
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
            throw new DomainException('Supplier not found', 404);
        }
        if ($this->repo->productCount($id) > 0) {
            throw new DomainException('Cannot delete a supplier that still has products assigned — reassign them first', 409);
        }
        $this->repo->delete($id);
    }

    /**
     * Never let the encrypted (or, worse, decrypted) api_key leave the backend —
     * only a boolean flag indicating whether one is configured.
     */
    private function sanitize(array $row): array
    {
        $row['has_api_key'] = !empty($row['api_key']);
        unset($row['api_key']);
        return $row;
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

        if (array_key_exists('contact_email', $input)) {
            $email = trim((string)($input['contact_email'] ?? ''));
            if ($email !== '' && !filter_var($email, FILTER_VALIDATE_EMAIL)) {
                throw new DomainException('Invalid contact email', 422);
            }
            $data['contact_email'] = $email !== '' ? $email : null;
        }

        if (array_key_exists('contact_phone', $input)) {
            $data['contact_phone'] = $input['contact_phone'] !== null && $input['contact_phone'] !== ''
                ? (string)$input['contact_phone']
                : null;
        }

        if (array_key_exists('api_base_url', $input)) {
            $url = trim((string)($input['api_base_url'] ?? ''));
            if ($url !== '' && !filter_var($url, FILTER_VALIDATE_URL)) {
                throw new DomainException('Invalid API base URL', 422);
            }
            $data['api_base_url'] = $url !== '' ? $url : null;
        }

        // Only re-encrypt if a new key was actually provided — an update that omits
        // api_key must never clear or touch the existing stored credential.
        if (array_key_exists('api_key', $input) && $input['api_key'] !== null && $input['api_key'] !== '') {
            $data['api_key'] = Encryption::encrypt((string)$input['api_key']);
        }

        if (array_key_exists('status', $input)) {
            if (!in_array($input['status'], self::VALID_STATUS, true)) {
                throw new DomainException('Invalid status', 422);
            }
            $data['status'] = $input['status'];
        }

        if (array_key_exists('slug', $input) && trim((string)$input['slug']) !== '') {
            $slug = slugify((string)$input['slug']);
        } elseif ($isCreate) {
            $slug = slugify($data['name']);
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
                throw new DomainException('A supplier with this slug already exists', 409);
            }
            $data['slug'] = $slug;
        }

        return $data;
    }
}
