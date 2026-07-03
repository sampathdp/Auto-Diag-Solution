<?php

declare(strict_types=1);

namespace App\Controllers;

use App\Core\Response;

abstract class BaseController
{
    protected function json(bool $success, string $message = '', $data = null, $errors = null, int $statusCode = 200): void
    {
        Response::json($success, $message, $data, $errors, $statusCode);
    }

    protected function success($data = null, string $message = 'Success', int $statusCode = 200): void
    {
        Response::success($data, $message, $statusCode);
    }

    protected function error(string $message = 'Error', $errors = null, int $statusCode = 400): void
    {
        Response::error($message, $errors, $statusCode);
    }
}
