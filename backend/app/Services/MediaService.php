<?php

declare(strict_types=1);

namespace App\Services;

use App\Core\FileUploader;
use App\Exceptions\DomainException;
use App\Repositories\MediaRepository;

class MediaService
{
    private MediaRepository $repo;

    public function __construct()
    {
        $this->repo = new MediaRepository();
    }

    public function list(int $page, int $perPage): array
    {
        return [
            'items' => $this->repo->all([], $page, $perPage),
            'total' => $this->repo->count(),
        ];
    }

    public function find(int $id): array
    {
        $media = $this->repo->find($id);
        if (!$media) {
            throw new DomainException('Media not found', 404);
        }
        return $media;
    }

    public function upload(array $file, ?int $uploadedBy, ?string $altTextEn, ?string $altTextAr): array
    {
        try {
            $relativePath = FileUploader::upload($file, 'media');
        } catch (\Exception $e) {
            // FileUploader's own message is already a safe, specific validation message
            // (e.g. "Invalid file type...") — surface it as-is instead of a generic 500.
            throw new DomainException($e->getMessage(), 422);
        }

        if ($relativePath === '') {
            throw new DomainException('No file was uploaded', 422);
        }

        $absolutePath = dirname(__DIR__, 2) . '/public' . $relativePath;
        $finfo = new \finfo(FILEINFO_MIME_TYPE);
        $mimeType = $finfo->file($absolutePath) ?: 'application/octet-stream';
        $sizeBytes = filesize($absolutePath) ?: 0;

        $id = $this->repo->create([
            'path' => $relativePath,
            'original_filename' => $file['name'] ?? basename($relativePath),
            'mime_type' => $mimeType,
            'size_bytes' => $sizeBytes,
            'alt_text_en' => $altTextEn !== null && $altTextEn !== '' ? $altTextEn : null,
            'alt_text_ar' => $altTextAr !== null && $altTextAr !== '' ? $altTextAr : null,
            'uploaded_by' => $uploadedBy,
        ]);

        return $this->find($id);
    }

    /** Alt-text is the only editable field — replacing the file itself is a new upload, not a PUT. */
    public function update(int $id, array $input): array
    {
        if (!$this->repo->find($id)) {
            throw new DomainException('Media not found', 404);
        }

        $data = [];
        if (array_key_exists('alt_text_en', $input)) {
            $data['alt_text_en'] = $input['alt_text_en'] !== null && $input['alt_text_en'] !== ''
                ? (string) $input['alt_text_en']
                : null;
        }
        if (array_key_exists('alt_text_ar', $input)) {
            $data['alt_text_ar'] = $input['alt_text_ar'] !== null && $input['alt_text_ar'] !== ''
                ? (string) $input['alt_text_ar']
                : null;
        }

        if (!empty($data)) {
            $this->repo->update($id, $data);
        }

        return $this->find($id);
    }

    public function delete(int $id): void
    {
        $media = $this->find($id);

        $absolutePath = dirname(__DIR__, 2) . '/public' . $media['path'];
        if (is_file($absolutePath)) {
            @unlink($absolutePath);
        }

        $this->repo->delete($id);
    }
}
