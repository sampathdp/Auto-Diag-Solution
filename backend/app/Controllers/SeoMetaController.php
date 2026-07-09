<?php

declare(strict_types=1);

namespace App\Controllers;

use App\Core\Request;
use App\Services\SeoMetaService;

class SeoMetaController extends BaseController
{
    private SeoMetaService $service;

    public function __construct()
    {
        $this->service = new SeoMetaService();
    }

    public function index(Request $request): void
    {
        $page = max(1, (int)($request->input('page') ?? 1));
        $perPage = min(100, max(1, (int)($request->input('per_page') ?? 15)));
        $search = trim((string)($request->input('search') ?? ''));
        $sortBy = (string)($request->input('sort_by') ?? 'created_at');
        $sortDir = (string)($request->input('sort_dir') ?? 'DESC');

        $filters = [];
        if ($request->input('page_type') !== null) {
            $filters['page_type'] = (string)$request->input('page_type');
        }
        if ($request->input('reference_id') !== null) {
            $filters['reference_id'] = (int)$request->input('reference_id');
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

    public function store(Request $request): void
    {
        $entry = $this->service->create($request->all());
        $this->success($entry, 'SEO entry created successfully', 201);
    }

    public function update(Request $request): void
    {
        $entry = $this->service->update((int)$request->getParam('id'), $request->all());
        $this->success($entry, 'SEO entry updated successfully');
    }

    public function destroy(Request $request): void
    {
        $this->service->delete((int)$request->getParam('id'));
        $this->success(null, 'SEO entry deleted successfully');
    }
}
