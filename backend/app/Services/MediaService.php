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

    /**
     * Editable fields: alt text, and the display filename. Replacing the file itself
     * is a new upload, not a PUT — but renaming IS supported: it renames the physical
     * file to a slug of the new name (keeping its real extension) and updates `path`
     * to match, so the public URL (derived from `path`, see mediaAdapter.ts) reflects
     * the rename too.
     */
    public function update(int $id, array $input): array
    {
        $media = $this->repo->find($id);
        if (!$media) {
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

        if (array_key_exists('original_filename', $input)) {
            $newName = trim((string) $input['original_filename']);
            if ($newName === '') {
                throw new DomainException('Filename cannot be empty', 422);
            }
            if ($newName !== $media['original_filename']) {
                $data['path'] = $this->renameStoredFile($media['path'], $newName);
            }
            $data['original_filename'] = $newName;
        }

        if (!empty($data)) {
            $this->repo->update($id, $data);
        }

        return $this->find($id);
    }

    /**
     * Renames the physical file to a slug of the new display name, keeping its real
     * extension (never one typed by the user). Falls back to a numeric suffix on a
     * same-directory collision, same as how uploads already dodge collisions.
     */
    private function renameStoredFile(string $currentPath, string $newDisplayName): string
    {
        $absoluteBase = dirname(__DIR__, 2) . '/public';
        $currentAbsolute = $absoluteBase . $currentPath;
        if (!is_file($currentAbsolute)) {
            throw new DomainException('Stored file is missing, cannot rename', 409);
        }

        $extension = pathinfo($currentPath, PATHINFO_EXTENSION);
        $directory = dirname($currentPath);

        $slug = trim((string) preg_replace('/[^a-z0-9]+/', '-', strtolower($newDisplayName)), '-');
        if ($slug === '') {
            $slug = 'file';
        }

        $suffix = 0;
        do {
            $candidateName = $suffix === 0 ? $slug : "{$slug}-{$suffix}";
            $candidatePath = $directory . '/' . $candidateName . ($extension !== '' ? '.' . $extension : '');
            $candidateAbsolute = $absoluteBase . $candidatePath;
            $suffix++;
        } while ($candidateAbsolute !== $currentAbsolute && is_file($candidateAbsolute));

        if ($candidateAbsolute === $currentAbsolute) {
            return $currentPath;
        }

        if (!@rename($currentAbsolute, $candidateAbsolute)) {
            throw new DomainException('Could not rename file on disk', 500);
        }

        return $candidatePath;
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
