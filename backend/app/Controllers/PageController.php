<?php

declare(strict_types=1);

namespace App\Controllers;

use App\Core\Request;
use App\Services\PageService;

class PageController extends BaseController
{
    private PageService $service;

    public function __construct()
    {
        $this->service = new PageService();
    }

    public function index(Request $request): void
    {
        $page = max(1, (int)($request->input('page') ?? 1));
        $perPage = min(1000, max(1, (int)($request->input('per_page') ?? 15)));
        $search = trim((string)($request->input('search') ?? ''));
        $sortBy = (string)($request->input('sort_by') ?? 'title_en');
        $sortDir = (string)($request->input('sort_dir') ?? 'ASC');

        $filters = [];
        if ($request->input('is_published') !== null) {
            $filters['is_published'] = (int)(bool)$request->input('is_published');
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

    // Public storefront lookup — no auth, published pages only. Mirrors
    // BrandController::active() / ProductController::publicShow().
    public function footerPages(Request $request): void
    {
        $this->success($this->service->footerPages());
    }

    public function publicShow(Request $request): void
    {
        $this->success($this->service->findPublishedBySlug((string)$request->getParam('slug')));
    }

    public function store(Request $request): void
    {
        $page = $this->service->create($request->all());
        $this->success($page, 'Page created successfully', 201);
    }

    public function update(Request $request): void
    {
        $page = $this->service->update((int)$request->getParam('id'), $request->all());
        $this->success($page, 'Page updated successfully');
    }

    public function destroy(Request $request): void
    {
        $this->service->delete((int)$request->getParam('id'));
        $this->success(null, 'Page deleted successfully');
    }
}
