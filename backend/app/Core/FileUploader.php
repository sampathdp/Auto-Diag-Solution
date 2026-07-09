<?php

declare(strict_types=1);

namespace App\Core;

class FileUploader
{
    private const ALLOWED_MIME_TYPES = [
        'image/jpeg'      => 'jpg',
        'image/png'       => 'png',
        'image/webp'      => 'webp',
        'image/gif'       => 'gif',
        'application/pdf' => 'pdf',
    ];

    public static function upload(array $file, string $subDir = ''): string
    {
        if (!isset($file['tmp_name']) || empty($file['tmp_name'])) {
            return '';
        }

        if ($file['error'] !== UPLOAD_ERR_OK) {
            if ($file['error'] === UPLOAD_ERR_NO_FILE) return '';
            throw new \Exception("File upload failed with error code: " . $file['error']);
        }

        // Validate MIME type from actual file content, not the client-supplied name
        $finfo = new \finfo(FILEINFO_MIME_TYPE);
        $mimeType = $finfo->file($file['tmp_name']);
        if (!isset(self::ALLOWED_MIME_TYPES[$mimeType])) {
            throw new \Exception("Invalid file type. Only JPG, PNG, and PDF are allowed.");
        }

        // Use the MIME-derived extension, never the client-supplied one
        $extension = self::ALLOWED_MIME_TYPES[$mimeType];

        // Base directory is the project root (backend/)
        $basePath = dirname(__DIR__, 2) . '/public/uploads/';
        $targetDir = $basePath . $subDir;
        if (!is_dir($targetDir)) {
            mkdir($targetDir, 0755, true);
        }

        $fileName = bin2hex(random_bytes(16)) . '.' . $extension;
        $targetFile = $targetDir . '/' . $fileName;

        if (!move_uploaded_file($file['tmp_name'], $targetFile)) {
            throw new \Exception("Failed to move uploaded file.");
        }

        return '/uploads/' . ($subDir ? $subDir . '/' : '') . $fileName;
    }
}
