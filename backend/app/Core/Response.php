<?php

declare(strict_types=1);

namespace App\Core;

class Response
{
    public static function json(
        bool $success,
        string $message = '',
        mixed $data = null,
        ?array $errors = null,
        int $statusCode = 200
    ): void {
        http_response_code($statusCode);
        header('Content-Type: application/json; charset=utf-8');

        echo json_encode([
            'success' => $success,
            'message' => $message,
            'data'    => $data,
            'errors'  => $errors
        ], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
        
        exit;
    }

    public static function success(mixed $data = null, string $message = 'Success', int $statusCode = 200): void
    {
        self::json(true, $message, $data, null, $statusCode);
    }

    public static function error(string $message = 'Error', ?array $errors = null, int $statusCode = 400): void
    {
        self::json(false, $message, null, $errors, $statusCode);
    }
}
