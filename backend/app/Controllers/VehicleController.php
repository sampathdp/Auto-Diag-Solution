<?php

declare(strict_types=1);

namespace App\Controllers;

use App\Core\Request;
use App\Services\VehicleService;

class VehicleController extends BaseController
{
    private VehicleService $service;

    public function __construct()
    {
        $this->service = new VehicleService();
    }

    public function index(Request $request): void
    {
        $page = max(1, (int)($request->input('page') ?? 1));
        $perPage = min(1000, max(1, (int)($request->input('per_page') ?? 15)));
        $search = trim((string)($request->input('search') ?? ''));
        $sortBy = (string)($request->input('sort_by') ?? 'year');
        $sortDir = (string)($request->input('sort_dir') ?? 'DESC');

        $filters = [];
        if ($request->input('year') !== null) {
            $filters['year'] = (int)$request->input('year');
        }
        if ($request->input('make') !== null) {
            $filters['make'] = (string)$request->input('make');
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

    /** Cascading Year -> Make -> Model dropdown support for the admin fitment picker. */
    public function filters(Request $request): void
    {
        $year = $request->input('year') !== null ? (int)$request->input('year') : null;
        $make = $request->input('make') !== null ? (string)$request->input('make') : null;
        $this->success($this->service->filters($year, $make));
    }

    public function show(Request $request): void
    {
        $this->success($this->service->find((int)$request->getParam('id')));
    }

    public function store(Request $request): void
    {
        $vehicle = $this->service->create($request->all());
        $this->success($vehicle, 'Vehicle created successfully', 201);
    }

    /** Bulk/Range add — one make+model+chassis + a year span expands into one row per year. */
    public function bulkStore(Request $request): void
    {
        $result = $this->service->bulkCreate($request->all());
        $createdCount = count($result['created']);
        $skippedCount = count($result['skipped']);
        $message = "{$createdCount} vehicle" . ($createdCount === 1 ? '' : 's') . ' added'
            . ($skippedCount > 0 ? ", {$skippedCount} already existed and were skipped" : '');
        $this->success($result, $message, 201);
    }

    public function update(Request $request): void
    {
        $vehicle = $this->service->update((int)$request->getParam('id'), $request->all());
        $this->success($vehicle, 'Vehicle updated successfully');
    }

    public function destroy(Request $request): void
    {
        $this->service->delete((int)$request->getParam('id'));
        $this->success(null, 'Vehicle deleted successfully');
    }
}
