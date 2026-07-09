<?php

declare(strict_types=1);

namespace App\Services;

use App\Exceptions\DomainException;
use App\Repositories\ReviewRepository;

class ReviewService
{
    private ReviewRepository $repo;

    public function __construct()
    {
        $this->repo = new ReviewRepository();
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
        $review = $this->repo->findWithDetails($id);
        if (!$review) {
            throw new DomainException('Review not found', 404);
        }
        return $review;
    }

    public function approve(int $id): array
    {
        if (!$this->repo->find($id)) {
            throw new DomainException('Review not found', 404);
        }
        $this->repo->update($id, ['is_approved' => 1]);
        return $this->find($id);
    }

    public function reject(int $id): array
    {
        if (!$this->repo->find($id)) {
            throw new DomainException('Review not found', 404);
        }
        $this->repo->update($id, ['is_approved' => 0]);
        return $this->find($id);
    }

    public function delete(int $id): void
    {
        if (!$this->repo->find($id)) {
            throw new DomainException('Review not found', 404);
        }
        $this->repo->delete($id);
    }
}
