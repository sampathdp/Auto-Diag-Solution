<?php

declare(strict_types=1);

namespace App\Controllers;

use App\Core\Request;
use App\Core\Auth\JWTService;

/**
 * Serves PUBLIC uploaded assets only (product media, part images, refund photos) from
 * public/uploads/{type}/{file}.
 *
 * Sensitive files (dealer documents, payment proofs, cheque images, invoices) are NOT
 * served here. They live in App\Core\PrivateStorage, outside the web root, and are only
 * reachable through dedicated endpoints that check ownership or an admin permission.
 * Checking "has any valid token" (what this controller used to do for the types below)
 * let any logged-in customer open any other customer's file.
 */
class StorageController extends BaseController
{
    // Former private types. Requests for them still need a login (so the old 401
    // behaviour holds), but nothing is ever served from here for these types.
    private const RETIRED_PRIVATE_TYPES = [
        'payment-proofs',
        'payment-slips',
        'documents',
        'invoices',
    ];

    // Allowed MIME types to prevent serving unexpected file formats. SVG is deliberately
    // excluded even though FileUploader doesn't currently accept SVG uploads either —
    // this list is what decides what gets served inline with no sanitization, and an
    // SVG can carry an embedded <script> that executes when opened directly.
    private const ALLOWED_MIME_TYPES = [
        'image/jpeg', 'image/png', 'image/gif', 'image/webp',
        'application/pdf',
    ];

    public function serve(Request $request): void
    {
        $type     = preg_replace('/[^a-zA-Z0-9_-]/', '', $request->getParam('type') ?? '');
        $filename = preg_replace('/[^a-zA-Z0-9._-]/', '', $request->getParam('file') ?? '');

        if (!$type || !$filename) {
            http_response_code(400);
            exit;
        }

        if (in_array($type, self::RETIRED_PRIVATE_TYPES, true)) {
            $authHeader = $request->getHeader('Authorization');

            if (!$authHeader || !str_starts_with($authHeader, 'Bearer ')) {
                $this->jsonExit(401, 'Unauthorized: authentication required');
            }

            try {
                (new JWTService())->validateToken(substr($authHeader, 7));
            } catch (\Exception $e) {
                $this->jsonExit(401, 'Unauthorized: ' . $e->getMessage());
            }

            $this->jsonExit(404, 'Not found');
        }

        $filePath = dirname(__DIR__, 2) . '/public/uploads/' . $type . '/' . $filename;

        if (!file_exists($filePath) || !is_file($filePath)) {
            http_response_code(404);
            exit;
        }

        $finfo    = new \finfo(FILEINFO_MIME_TYPE);
        $mimeType = $finfo->file($filePath);

        // Only serve allowed MIME types to prevent content injection attacks
        if (!in_array($mimeType, self::ALLOWED_MIME_TYPES, true)) {
            $this->jsonExit(403, 'Forbidden: file type not allowed');
        }

        header('Content-Type: ' . $mimeType);
        header('Content-Length: ' . filesize($filePath));
        header('Cache-Control: public, max-age=3600');
        header('X-Content-Type-Options: nosniff');
        readfile($filePath);
        exit;
    }

    private function jsonExit(int $status, string $message): never
    {
        http_response_code($status);
        header('Content-Type: application/json');
        echo json_encode(['success' => false, 'message' => $message]);
        exit;
    }
}
