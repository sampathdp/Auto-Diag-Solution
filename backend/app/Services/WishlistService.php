<?php

declare(strict_types=1);

namespace App\Services;

use App\Exceptions\DomainException;
use App\Repositories\WishlistRepository;

class WishlistService
{
    private WishlistRepository $repo;
    private ProductService $products;

    public function __construct()
    {
        $this->repo = new WishlistRepository();
        $this->products = new ProductService();
    }

    /** Full product objects, in the order they were added to the wishlist. */
    public function list(int $userId): array
    {
        $ids = array_map('intval', $this->repo->productIdsForUser($userId));
        if (!$ids) {
            return [];
        }

        $result = $this->products->publicList(['ids' => $ids], '', 'newest', 1, count($ids));
        $byId = [];
        foreach ($result['items'] as $item) {
            $byId[$item['id']] = $item;
        }

        // Preserve wishlist order rather than whatever order the product query returned.
        return array_values(array_filter(array_map(fn (int $id) => $byId[$id] ?? null, $ids)));
    }

    public function add(int $userId, int $productId): void
    {
        // Throws DomainException(404) if the product doesn't exist / isn't active.
        $this->products->publicFind($productId);
        $this->repo->add($userId, $productId);
    }

    public function remove(int $userId, int $productId): void
    {
        $this->repo->remove($userId, $productId);
    }

    public function clear(int $userId): void
    {
        $this->repo->clear($userId);
    }
}
