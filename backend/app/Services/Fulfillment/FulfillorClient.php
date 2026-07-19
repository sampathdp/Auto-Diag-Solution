<?php

declare(strict_types=1);

namespace App\Services\Fulfillment;

/**
 * Thin HTTP client for the Fulfillor REST API (Products/Orders/Inventory/Incoming
 * Shipments/Organization — see the vendor's v1 REST reference). Not configured until
 * FULFILLOR_BASE_URL and FULFILLOR_API_KEY are set in .env; isConfigured() lets
 * callers skip the integration cleanly until real credentials exist.
 */
class FulfillorClient
{
    private ?string $baseUrl;
    private ?string $apiKey;

    public function __construct()
    {
        $baseUrl = trim((string)($_ENV['FULFILLOR_BASE_URL'] ?? ''));
        $apiKey = trim((string)($_ENV['FULFILLOR_API_KEY'] ?? ''));
        $this->baseUrl = $baseUrl !== '' ? rtrim($baseUrl, '/') : null;
        $this->apiKey = $apiKey !== '' ? $apiKey : null;
    }

    public function isConfigured(): bool
    {
        return $this->baseUrl !== null && $this->apiKey !== null;
    }

    /**
     * POST /rest/s1/api/v1/orders — hands a placed order to Fulfillor for fulfillment.
     * @return array Decoded response body (includes the Fulfillor orderId on success).
     */
    public function createOrder(array $payload): array
    {
        return $this->request('POST', '/rest/s1/api/v1/orders', $payload);
    }

    /** GET /rest/s1/api/v1/orders/{orderId} — pulls current status/fulfillment info. */
    public function getOrder(string $fulfillorOrderId): array
    {
        return $this->request('GET', '/rest/s1/api/v1/orders/' . rawurlencode($fulfillorOrderId));
    }

    private function request(string $method, string $path, ?array $body = null): array
    {
        if (!$this->isConfigured()) {
            throw new FulfillorApiException('Fulfillor is not configured (set FULFILLOR_BASE_URL / FULFILLOR_API_KEY)');
        }

        $ch = curl_init($this->baseUrl . $path);
        curl_setopt_array($ch, [
            CURLOPT_CUSTOMREQUEST => $method,
            CURLOPT_HTTPHEADER => [
                'api_key: ' . $this->apiKey,
                'Content-Type: application/json',
                'Accept: application/json',
            ],
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_TIMEOUT => 8,
            CURLOPT_CONNECTTIMEOUT => 5,
        ]);
        if ($body !== null) {
            curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($body, JSON_UNESCAPED_UNICODE));
        }

        $responseBody = curl_exec($ch);
        if ($responseBody === false) {
            $error = curl_error($ch);
            curl_close($ch);
            throw new FulfillorApiException("Fulfillor request failed: {$error}");
        }

        $statusCode = (int)curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);

        $decoded = json_decode((string)$responseBody, true);

        if ($statusCode < 200 || $statusCode >= 300) {
            $message = is_array($decoded) && isset($decoded['message']) ? (string)$decoded['message'] : "HTTP {$statusCode}";
            throw new FulfillorApiException("Fulfillor request failed: {$message}", $statusCode);
        }

        return is_array($decoded) ? $decoded : [];
    }
}
