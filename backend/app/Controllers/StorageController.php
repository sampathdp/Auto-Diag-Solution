<?php

declare(strict_types=1);

namespace App\Controllers;

use App\Core\Request;
use App\Core\Auth\JWTService;

class StorageController extends BaseController
{
    // File types that contain sensitive data and require a valid JWT to access.
    // Public asset types (logos, avatars, covers) are intentionally NOT in this list.
    private const PRIVATE_TYPES = [
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

        // Enforce authentication for private file types
        if (in_array($type, self::PRIVATE_TYPES, true)) {
            $authHeader = $request->getHeader('Authorization');

            if (!$authHeader || !str_starts_with($authHeader, 'Bearer ')) {
                http_response_code(401);
                header('Content-Type: application/json');
                echo json_encode(['success' => false, 'message' => 'Unauthorized: authentication required']);
                exit;
            }

            try {
                $jwtService = new JWTService();
                $jwtService->validateToken(substr($authHeader, 7));
            } catch (\Exception $e) {
                http_response_code(401);
                header('Content-Type: application/json');
                echo json_encode(['success' => false, 'message' => 'Unauthorized: ' . $e->getMessage()]);
                exit;
            }
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
            http_response_code(403);
            header('Content-Type: application/json');
            echo json_encode(['success' => false, 'message' => 'Forbidden: file type not allowed']);
            exit;
        }

        header('Content-Type: ' . $mimeType);
        header('Content-Length: ' . filesize($filePath));
        header('Cache-Control: private, max-age=3600');
        header('X-Content-Type-Options: nosniff');
        readfile($filePath);
        exit;
    }
}
