<?php

declare(strict_types=1);

if (!function_exists('env')) {
    function env(string $key, $default = null) {
        return $_ENV[$key] ?? $default;
    }
}

if (!function_exists('dd')) {
    function dd(...$vars) {
        header('Content-Type: application/json');
        echo json_encode($vars, JSON_PRETTY_PRINT);
        die();
    }
}

if (!function_exists('sanitize')) {
    function sanitize(string $data): string {
        return htmlspecialchars(strip_tags(trim($data)));
    }
}
