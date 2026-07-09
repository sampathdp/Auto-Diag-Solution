<?php

declare(strict_types=1);

namespace App\Controllers;

use App\Core\Request;
use App\Services\MediaService;

class MediaController extends BaseController
{
    private MediaService $service;

    public function __construct()
    {
        $this->service = new MediaService();
    }

    public function index(Request $request): void
    {
        $page = max(1, (int)($request->input('page') ?? 1));
        $perPage = min(100, max(1, (int)($request->input('per_page') ?? 24)));

        $result = $this->service->list($page, $perPage);

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

    public function store(Request $request): void
    {
        $files = $request->getFiles();
        if (empty($files['file'])) {
            $this->error('No file provided', null, 400);
            return;
        }

        $media = $this->service->upload(
            $files['file'],
            (int)$request->user->id,
            $request->input('alt_text_en'),
            $request->input('alt_text_ar')
        );

        $this->success($media, 'File uploaded successfully', 201);
    }

    public function update(Request $request): void
    {
        $media = $this->service->update((int)$request->getParam('id'), $request->all());
        $this->success($media, 'Media updated successfully');
    }

    public function destroy(Request $request): void
    {
        $this->service->delete((int)$request->getParam('id'));
        $this->success(null, 'Media deleted successfully');
    }
}
