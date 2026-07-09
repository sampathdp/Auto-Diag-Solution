<?php

declare(strict_types=1);

namespace App\Core;

class Request
{
    private array $queryParams;
    private array $bodyParams;
    private array $serverParams;
    private array $headers;
    private array $routeParams = [];
    public ?object $user = null;

    public function __construct()
    {
        $this->queryParams  = $_GET;
        $this->serverParams = $_SERVER;
        $this->headers      = $this->readAllHeaders();
        $this->parseBody();
    }

    /**
     * Read HTTP headers from all available sources.
     *
     * getallheaders() is unreliable across environments:
     *   - Unavailable in PHP CLI SAPI entirely
     *   - Apache without CGIPassAuth strips the Authorization header
     *   - Some Nginx/PHP-FPM setups strip it silently
     *
     * The $_SERVER['HTTP_*'] variables are the universal fallback —
     * the PHP built-in server, Apache, and Nginx all populate them.
     */
    private function readAllHeaders(): array
    {
        // Start with getallheaders() if available (works on PHP 7.3+ built-in server)
        $headers = function_exists('getallheaders') ? (getallheaders() ?: []) : [];

        // Supplement from $_SERVER HTTP_* keys — this is the reliable universal source
        foreach ($_SERVER as $key => $value) {
            if (str_starts_with($key, 'HTTP_')) {
                // Convert HTTP_AUTHORIZATION → Authorization
                $headerName = str_replace('_', '-', ucwords(strtolower(substr($key, 5)), '_'));
                if (!isset($headers[$headerName])) {
                    $headers[$headerName] = $value;
                }
            }
        }

        // Apache with CGI/RewriteRule sometimes puts it here
        if (!isset($headers['Authorization']) && isset($_SERVER['REDIRECT_HTTP_AUTHORIZATION'])) {
            $headers['Authorization'] = $_SERVER['REDIRECT_HTTP_AUTHORIZATION'];
        }

        return $headers;
    }

    private function parseBody(): void
    {
        $contentType = $this->getHeader('Content-Type') ?? '';
        
        if (str_contains($contentType, 'application/json')) {
            $data = json_decode(file_get_contents('php://input'), true);
            $this->bodyParams = is_array($data) ? $data : [];
        } else {
            $this->bodyParams = $_POST;
        }
    }

    public function getMethod(): string
    {
        return strtoupper($this->serverParams['REQUEST_METHOD'] ?? 'GET');
    }

    public function getUri(): string
    {
        $uri = $this->serverParams['REQUEST_URI'] ?? '/';
        return strtok($uri, '?');
    }

    public function getHeader(string $name): ?string
    {
        $name = strtolower($name);
        foreach ($this->headers as $key => $value) {
            if (strtolower($key) === $name) {
                return $value;
            }
        }
        return null;
    }

    public function setParam(string $key, string $value): void
    {
        $this->routeParams[$key] = $value;
    }

    public function param(string $key, $default = null): mixed
    {
        return $this->routeParams[$key] ?? $default;
    }

    public function getParam(string $key, $default = null): mixed
    {
        return $this->param($key, $default);
    }

    public function all(): array
    {
        return array_merge($this->queryParams, $this->bodyParams, $this->routeParams);
    }

    public function input(string $key, $default = null): mixed
    {
        return $this->all()[$key] ?? $default;
    }

    public function getFiles(): array
    {
        return $_FILES;
    }

    /**
     * Client IP for rate-limiting purposes. Deliberately uses REMOTE_ADDR only —
     * X-Forwarded-For/X-Real-IP are attacker-controlled unless a trusted proxy strips
     * and re-sets them, which this app's deployment does not guarantee.
     */
    public function getIp(): string
    {
        return $this->serverParams['REMOTE_ADDR'] ?? '0.0.0.0';
    }
}
