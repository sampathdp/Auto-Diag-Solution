<?php

declare(strict_types=1);

namespace App\Core;

use App\Exceptions\DomainException;

/**
 * Storage for sensitive files: dealer trade licences, Emirates ID images, payment
 * proofs, cheque images.
 *
 * Files live in backend/storage/private, which is outside public/ AND blocked by the
 * production root .htaccess, so no URL maps straight to them. The only way to read one
 * is through a controller that has already checked who is asking (owner or an admin
 * with the right permission) and then calls stream().
 *
 * Callers keep the returned `key` in their own table (e.g. dealer_documents.storage_key)
 * and never send it to the browser: APIs expose a record id, not a path.
 */
final class PrivateStorage
{
    private const DEFAULT_MAX_BYTES = 5 * 1024 * 1024;
    private const DEFAULT_MIMES = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];

    public static function root(): string
    {
        $configured = trim((string)($_ENV['PRIVATE_STORAGE_PATH'] ?? ''));
        $root = $configured !== '' ? rtrim($configured, '/\\') : dirname(__DIR__, 2) . '/storage/private';
        self::ensureRoot($root);
        return $root;
    }

    /**
     * Validates and stores one uploaded file ($_FILES entry). Images are kept as-is (no
     * WebP transcoding) so identity documents stay byte-identical to what was uploaded.
     *
     * @param string   $bucket  folder under the root, e.g. "dealer-docs/42"
     * @param string[] $allowedMimes
     * @return array{key:string,mime:string,size:int,sha256:string,original_name:string}|null
     *         null when no file was sent
     */
    public static function store(array $file, string $bucket, ?int $maxBytes = null, ?array $allowedMimes = null): ?array
    {
        $mime = FileUploader::validateUpload($file, $allowedMimes ?? self::DEFAULT_MIMES);
        if ($mime === null) {
            return null;
        }

        $size = (int)($file['size'] ?? filesize($file['tmp_name']));
        $limit = $maxBytes ?? self::DEFAULT_MAX_BYTES;
        if ($size <= 0 || $size > $limit) {
            throw new DomainException('File is too large. Maximum size is ' . self::humanSize($limit) . '.', 422);
        }

        $bucket = self::cleanBucket($bucket);
        $dir = self::root() . '/' . $bucket;
        if (!is_dir($dir) && !mkdir($dir, 0750, true) && !is_dir($dir)) {
            throw new \RuntimeException('Could not create private storage folder.');
        }

        $name = bin2hex(random_bytes(20)) . '.' . FileUploader::extensionFor($mime);
        $target = $dir . '/' . $name;
        if (!move_uploaded_file($file['tmp_name'], $target)) {
            throw new \RuntimeException('Failed to store uploaded file.');
        }
        @chmod($target, 0640);

        $original = (string)($file['name'] ?? 'file');
        $original = mb_substr(preg_replace('/[^\pL\pN._ -]/u', '_', basename($original)) ?: 'file', 0, 150);

        return [
            'key' => $bucket . '/' . $name,
            'mime' => $mime,
            'size' => $size,
            'sha256' => hash_file('sha256', $target),
            'original_name' => $original,
        ];
    }

    public static function exists(string $key): bool
    {
        $path = self::resolve($key);
        return $path !== null && is_file($path);
    }

    public static function delete(string $key): void
    {
        $path = self::resolve($key);
        if ($path !== null && is_file($path)) {
            @unlink($path);
        }
    }

    /**
     * Sends the file and ends the request. Authorization must already have happened.
     * $inline = true lets the admin preview images/PDFs in the browser; false forces download.
     */
    public static function stream(string $key, string $downloadName, bool $inline = true): never
    {
        $path = self::resolve($key);
        if ($path === null || !is_file($path)) {
            Response::error('File not found', null, 404);
        }

        $finfo = new \finfo(FILEINFO_MIME_TYPE);
        $mime = (string)$finfo->file($path);
        if (!in_array($mime, self::DEFAULT_MIMES, true) && $mime !== 'image/gif') {
            Response::error('File type not allowed', null, 403);
        }

        $safeName = preg_replace('/[^A-Za-z0-9._-]/', '_', $downloadName) ?: 'file';
        header('Content-Type: ' . $mime);
        header('Content-Length: ' . filesize($path));
        header('Content-Disposition: ' . ($inline ? 'inline' : 'attachment') . '; filename="' . $safeName . '"');
        header('Cache-Control: private, no-store, max-age=0');
        header('Pragma: no-cache');
        header('X-Content-Type-Options: nosniff');
        header("Content-Security-Policy: default-src 'none'; img-src 'self'; style-src 'unsafe-inline'; sandbox");
        readfile($path);
        exit;
    }

    /** Maps a stored key to an absolute path, refusing anything that escapes the root. */
    private static function resolve(string $key): ?string
    {
        if ($key === '' || str_contains($key, '..') || str_contains($key, "\0") || !preg_match('#^[A-Za-z0-9/_.-]+$#', $key)) {
            return null;
        }
        $root = realpath(self::root());
        $path = realpath($root . '/' . $key);
        if ($root === false || $path === false) {
            return null;
        }
        $root = rtrim(str_replace('\\', '/', $root), '/') . '/';
        $normalized = str_replace('\\', '/', $path);
        return str_starts_with($normalized, $root) ? $path : null;
    }

    private static function cleanBucket(string $bucket): string
    {
        $parts = array_filter(explode('/', str_replace('\\', '/', $bucket)), fn ($p) => $p !== '' && $p !== '.' && $p !== '..');
        $parts = array_map(fn ($p) => preg_replace('/[^A-Za-z0-9_-]/', '', $p), $parts);
        $parts = array_filter($parts, fn ($p) => $p !== '');
        if (!$parts) {
            throw new \InvalidArgumentException('Invalid storage bucket.');
        }
        return implode('/', $parts);
    }

    /** Creates the root and drops deny-all guards in it, in case it ever ends up web-reachable. */
    private static function ensureRoot(string $root): void
    {
        if (!is_dir($root) && !mkdir($root, 0750, true) && !is_dir($root)) {
            throw new \RuntimeException('Private storage folder is missing and could not be created.');
        }
        $htaccess = $root . '/.htaccess';
        if (!is_file($htaccess)) {
            @file_put_contents($htaccess, "Require all denied\n<IfModule !mod_authz_core.c>\n    Order allow,deny\n    Deny from all\n</IfModule>\n");
        }
        $index = $root . '/index.html';
        if (!is_file($index)) {
            @file_put_contents($index, '');
        }
    }

    private static function humanSize(int $bytes): string
    {
        return $bytes >= 1048576 ? round($bytes / 1048576, 1) . ' MB' : round($bytes / 1024) . ' KB';
    }
}
