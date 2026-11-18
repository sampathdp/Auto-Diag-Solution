<?php

declare(strict_types=1);

namespace App\Services\Fulfillment;

/**
 * Thin HTTP client for the Fulfillor REST API (Products/Orders/Inventory/Incoming
 * Shipments/Organization — see Fulfillor_API_v1_Reference.pdf). Not configured until
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

    /** POST /orders — hands a placed order to Fulfillor for fulfillment. */
    public function createOrder(array $payload): array
    {
        return $this->request('POST', '/rest/s1/api/v1/orders', $payload);
    }

    /** GET /orders/{orderId} — current status/fulfillment info. */
    public function getOrder(string $fulfillorOrderId): array
    {
        return $this->request('GET', '/rest/s1/api/v1/orders/' . rawurlencode($fulfillorOrderId));
    }

    /** PUT /orders/{orderId} — status/shipping/message changes (only supplied fields change). */
    public function updateOrder(string $fulfillorOrderId, array $payload): array
    {
        return $this->request('PUT', '/rest/s1/api/v1/orders/' . rawurlencode($fulfillorOrderId), $payload);
    }

    /** GET /products — paginated, filterable by sku/upc/name/status. */
    public function listProducts(array $query): array
    {
        return $this->request('GET', '/rest/s1/api/v1/products?' . http_build_query($query));
    }

    /** POST /products — creates a product under the organization. */
    public function createProduct(array $payload): array
    {
        return $this->request('POST', '/rest/s1/api/v1/products', $payload);
    }

    /**
     * GET /inventory — stock rows for the given products at a facility. Rows may be
     * split by location, so callers must sum per productId.
     * @param string[] $productIds
     */
    public function getInventory(string $orgId, string $facilityId, array $productIds, string $statusId = 'AstAvailable'): array
    {
        return $this->request('GET', '/rest/s1/api/v1/inventory?' . http_build_query([
            'orgId' => $orgId,
            'facilityId' => $facilityId,
            'productIds' => implode(',', $productIds),
            'statusId' => $statusId,
        ]));
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
            CURLOPT_TIMEOUT => 15,
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
            // Moqui errors come back as {"errorCode":400,"errors":"..."}; the docs' own
            // samples use "message" — accept either.
            $message = "HTTP {$statusCode}";
            if (is_array($decoded)) {
                $message = (string)($decoded['message'] ?? $decoded['errors'] ?? $message);
            }
            throw new FulfillorApiException('Fulfillor request failed: ' . trim($message), $statusCode);
        }

        return is_array($decoded) ? $decoded : [];
    }
}
