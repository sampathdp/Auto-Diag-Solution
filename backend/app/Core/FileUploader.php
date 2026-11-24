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

    // JPEG/PNG uploads get transcoded to WebP for smaller file sizes. GIF is excluded
    // because GD's WebP encoder only captures a single frame — converting an animated
    // GIF would silently lose the animation.
    private const WEBP_CONVERTIBLE_MIME_TYPES = ['image/jpeg', 'image/png'];

    public static function upload(array $file, string $subDir = ''): string
    {
        $mimeType = self::validateUpload($file);
        if ($mimeType === null) {
            return '';
        }

        // Base directory is the project root (backend/)
        $basePath = dirname(__DIR__, 2) . '/public/uploads/';
        $targetDir = $basePath . $subDir;
        if (!is_dir($targetDir)) {
            mkdir($targetDir, 0755, true);
        }

        if (in_array($mimeType, self::WEBP_CONVERTIBLE_MIME_TYPES, true)) {
            $fileName = bin2hex(random_bytes(16)) . '.webp';
            self::convertToWebp($file['tmp_name'], $targetDir . '/' . $fileName, $mimeType);
        } else {
            // Use the MIME-derived extension, never the client-supplied one
            $fileName = bin2hex(random_bytes(16)) . '.' . self::ALLOWED_MIME_TYPES[$mimeType];
            if (!move_uploaded_file($file['tmp_name'], $targetDir . '/' . $fileName)) {
                throw new \Exception("Failed to move uploaded file.");
            }
        }

        return '/uploads/' . ($subDir ? $subDir . '/' : '') . $fileName;
    }

    /**
     * Shared upload checks (also used by PrivateStorage): PHP upload error, that the file
     * really is an upload, and the MIME type sniffed from its content (never the client's
     * name or Content-Type).
     *
     * @param string[]|null $allowedMimes  subset of ALLOWED_MIME_TYPES keys; null = all
     * @return string|null the detected MIME type, or null when no file was sent
     */
    public static function validateUpload(array $file, ?array $allowedMimes = null): ?string
    {
        if (!isset($file['error'])) {
            return null;
        }

        // Error must be checked before tmp_name: PHP leaves tmp_name empty for most
        // error cases, not just "no file selected" — an empty-tmp_name check done
        // first (as this used to be) silently swallows the real reason (e.g. a file
        // bigger than upload_max_filesize) into an unhelpful generic message.
        if ((int) $file['error'] === UPLOAD_ERR_NO_FILE) {
            return null;
        }
        if ((int) $file['error'] !== UPLOAD_ERR_OK) {
            throw new \Exception(self::errorMessage((int) $file['error']));
        }

        if (empty($file['tmp_name']) || !is_uploaded_file($file['tmp_name'])) {
            throw new \Exception("Invalid upload.");
        }

        // Validate MIME type from actual file content, not the client-supplied name
        $finfo = new \finfo(FILEINFO_MIME_TYPE);
        $mimeType = (string) $finfo->file($file['tmp_name']);
        $allowed = $allowedMimes ?? array_keys(self::ALLOWED_MIME_TYPES);
        if (!isset(self::ALLOWED_MIME_TYPES[$mimeType]) || !in_array($mimeType, $allowed, true)) {
            throw new \Exception("Invalid file type. Only JPG, PNG, and PDF are allowed.");
        }

        return $mimeType;
    }

    /** File extension for an allowed MIME type (never derived from the client's file name). */
    public static function extensionFor(string $mimeType): string
    {
        return self::ALLOWED_MIME_TYPES[$mimeType] ?? 'bin';
    }

    /** Human-readable message per PHP UPLOAD_ERR_* code — shown to the admin as-is. */
    private static function errorMessage(int $code): string
    {
        return match ($code) {
            UPLOAD_ERR_INI_SIZE => "File is too large. Maximum file size is " . ini_get('upload_max_filesize') . ".",
            UPLOAD_ERR_FORM_SIZE => "File is too large.",
            UPLOAD_ERR_PARTIAL => "The file was only partially uploaded. Please try again.",
            UPLOAD_ERR_NO_TMP_DIR => "Server has no temporary folder configured for uploads.",
            UPLOAD_ERR_CANT_WRITE => "Failed to write the file to disk.",
            UPLOAD_ERR_EXTENSION => "The upload was stopped by a server extension.",
            default => "File upload failed with error code: {$code}.",
        };
    }

    /** Decodes a JPEG/PNG and re-encodes it as WebP, preserving PNG transparency. */
    private static function convertToWebp(string $sourcePath, string $targetPath, string $mimeType): void
    {
        $image = $mimeType === 'image/png' ? @imagecreatefrompng($sourcePath) : @imagecreatefromjpeg($sourcePath);
        if ($image === false) {
            throw new \Exception("Could not read image for WebP conversion.");
        }

        imagepalettetotruecolor($image);
        imagealphablending($image, true);
        imagesavealpha($image, true);

        $ok = imagewebp($image, $targetPath, 82);
        imagedestroy($image);

        if (!$ok) {
            throw new \Exception("Could not encode image as WebP.");
        }
    }
}
