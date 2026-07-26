<?php

declare(strict_types=1);

namespace App\Controllers;

use App\Core\Request;
use App\Services\ReviewService;

class ReviewController extends BaseController
{
    private ReviewService $service;

    public function __construct()
    {
        $this->service = new ReviewService();
    }

    public function index(Request $request): void
    {
        $page = max(1, (int)($request->input('page') ?? 1));
        $perPage = min(1000, max(1, (int)($request->input('per_page') ?? 15)));
        $search = trim((string)($request->input('search') ?? ''));
        $sortBy = (string)($request->input('sort_by') ?? 'created_at');
        $sortDir = (string)($request->input('sort_dir') ?? 'DESC');

        $filters = [];
        if ($request->input('is_approved') !== null) {
            $filters['is_approved'] = (int)(bool)$request->input('is_approved');
        }
        if ($request->input('product_id') !== null) {
            $filters['product_id'] = (int)$request->input('product_id');
        }
        if ($request->input('rating') !== null) {
            $filters['rating'] = (int)$request->input('rating');
        }

        $result = $this->service->list($filters, $search, $sortBy, $sortDir, $page, $perPage);

        $this->success([
            'items' => $result['items'],
            'meta' => [
                'page' => $page,
                'per_page' => $perPage,
                'total' => $result['total'],
                'total_pages' => (int)ceil($result['total'] / $perPage),
            ],
        ]);
    }

    public function show(Request $request): void
    {
        $this->success($this->service->find((int)$request->getParam('id')));
    }

    /** Public — one real approved review for the storefront testimonial section. */
    public function featured(Request $request): void
    {
        $this->success($this->service->featured());
    }

    public function approve(Request $request): void
    {
        $review = $this->service->approve((int)$request->getParam('id'));
        $this->success($review, 'Review approved successfully');
    }

    public function reject(Request $request): void
    {
        $review = $this->service->reject((int)$request->getParam('id'));
        $this->success($review, 'Review rejected successfully');
    }

    public function destroy(Request $request): void
    {
        $this->service->delete((int)$request->getParam('id'));
        $this->success(null, 'Review deleted successfully');
    }
}
