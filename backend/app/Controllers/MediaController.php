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
        $perPage = min(1000, max(1, (int)($request->input('per_page') ?? 24)));

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
            [$message, $statusCode] = $this->missingFileError();
            $this->error($message, null, $statusCode);
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

    /**
     * When the request body exceeds `post_max_size`, PHP empties $_FILES/$_POST
     * entirely before any app code runs — no error field, nothing to catch. Without
     * this, an oversized upload looks identical to "no file attached" and the real
     * problem (file too large) never reaches the user.
     *
     * @return array{0: string, 1: int} [message, statusCode]
     */
    private function missingFileError(): array
    {
        $contentLength = (int) ($_SERVER['CONTENT_LENGTH'] ?? 0);
        $postMaxBytes = self::iniToBytes((string) ini_get('post_max_size'));

        if ($contentLength > 0 && $postMaxBytes > 0 && $contentLength > $postMaxBytes) {
            return ["File is too large. Maximum upload size is " . intdiv($postMaxBytes, 1048576) . " MB.", 413];
        }

        return ['No file provided', 400];
    }

    private static function iniToBytes(string $value): int
    {
        $value = trim($value);
        if ($value === '') {
            return 0;
        }
        $unit = strtolower(substr($value, -1));
        $number = (int) $value;
        return match ($unit) {
            'g' => $number * 1024 * 1024 * 1024,
            'm' => $number * 1024 * 1024,
            'k' => $number * 1024,
            default => (int) $value,
        };
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
