<?php

declare(strict_types=1);

namespace App\Services\Fulfillment;

use App\Exceptions\DomainException;
use App\Repositories\OrderRepository;
use App\Repositories\ProductRepository;

/**
 * Integration with Fulfillor (external 3PL / WMS platform, built on Moqui — see
 * Fulfillor_API_v1_Reference.pdf): their warehouse holds our stock, picks, packs and
 * hands orders to a courier.
 *
 * Order flow is deliberately best-effort and non-blocking: until FULFILLOR_BASE_URL /
 * FULFILLOR_API_KEY are set every order method no-ops, and even once they are, an
 * outage on Fulfillor's side must never stop a checkout or an admin action from
 * succeeding locally. Failures are recorded on the order (fulfillor_sync_error) instead
 * of thrown. The product-linking methods are the exception: they're explicit admin
 * actions, so they throw a DomainException the admin sees directly.
 *
 * v1 is a pull-only REST API with no documented webhooks, so status comes back via
 * polling (syncAllPending(), scheduled through `php console.php fulfillor:sync`).
 */
class FulfillmentService
{
    /**
     * Fulfillor order statusId -> our status. Moqui order statuses. OrderPlaced and
     * OrderApproved are confirmed by the reference doc and the live account; the rest
     * are Moqui's standard OrderStatus enum values.
     */
    private const ORDER_STATUS_MAP = [
        'OrderOpen' => 'processing',
        'OrderRequested' => 'processing',
        'OrderPlaced' => 'processing',
        'OrderProcessing' => 'processing',
        'OrderApproved' => 'processing',
        'OrderHold' => 'processing',
        'OrderSent' => 'shipped',
        'OrderCompleted' => 'shipped', // Moqui completes an order once fully shipped — not proof of delivery
        'OrderCancelled' => 'cancelled',
        'OrderRejected' => 'cancelled',
    ];

    /**
     * Fulfillor shipment (fulfillments[].status) -> our status. ShipInput is confirmed
     * by the reference doc; the rest are Moqui's standard ShipmentStatus enum values.
     * Physical progress shows up here, not on the order status, which stays
     * "OrderApproved" while the warehouse works on it (seen on the live account).
     */
    private const SHIPMENT_STATUS_MAP = [
        'ShipInput' => 'processing',
        'ShipScheduled' => 'processing',
        'ShipPicked' => 'processing',
        'ShipPacked' => 'processing',
        'ShipShipped' => 'shipped',
        'ShipDelivered' => 'delivered',
    ];

    // Forward-only progression; a stale poll must never move an order backwards.
    private const PROGRESS_RANK = ['processing' => 1, 'shipped' => 2, 'delivered' => 3];

    private const TERMINAL_STATUSES = ['delivered', 'cancelled', 'refunded'];

    private FulfillorClient $client;
    private OrderRepository $orders;
    private ProductRepository $products;

    public function __construct()
    {
        $this->client = new FulfillorClient();
        $this->orders = new OrderRepository();
        $this->products = new ProductRepository();
    }

    public function isConfigured(): bool
    {
        return $this->client->isConfigured();
    }

    // ---------------------------------------------------------------- orders

    public function pushOrder(int $orderId): void
    {
        if (!$this->client->isConfigured()) {
            return;
        }

        try {
            $order = $this->orders->findWithCustomer($orderId);
            if (!$order) {
                return;
            }

            $shipping = json_decode((string)($order['shipping_snapshot'] ?? ''), true) ?: [];
            [$lineItems, $unmapped] = $this->buildLineItems($this->orders->items($orderId));

            if (!$lineItems) {
                $this->recordSyncError($orderId, 'No line items are mapped to a Fulfillor product id yet '
                    . '(set products.fulfillor_product_id for: ' . implode(', ', $unmapped) . ').');
                return;
            }

            $address1 = trim(implode(' ', array_filter([$shipping['building'] ?? '', $shipping['street'] ?? ''])));
            $address2 = trim(implode(', ', array_filter([$shipping['apartment'] ?? '', $shipping['area'] ?? ''])));
            $emirate = (string)($shipping['emirate'] ?? '');

            $response = $this->client->createOrder([
                'ownerPartyId' => (string)($_ENV['FULFILLOR_ORG_ID'] ?? ''),
                'customer' => [
                    'email' => $order['customer_email'] ?? '',
                    'name' => $shipping['name'] ?? ($order['customer_name'] ?? ''),
                    'phone' => $shipping['phone'] ?? '',
                    'address1' => $address1 !== '' ? $address1 : ($shipping['area'] ?? ''),
                    'address2' => $address2,
                    'city' => ($shipping['city'] ?? '') ?: $emirate,
                    'state' => $emirate,
                    'country' => 'AE',
                    // UAE has no postal codes; the API requires the field. Fulfillor's own
                    // UAE orders use a placeholder too.
                    'postalCode' => '00000',
                ],
                'productStoreId' => (string)($_ENV['FULFILLOR_STORE_ID'] ?? ''),
                'currencyUomId' => $order['currency'] ?? 'AED',
                'externalId' => $order['order_number'],
                'orderName' => $order['order_number'],
                'salesChannelEnumId' => 'ScWeb',
                'shippingFeeAmount' => (float)$order['shipping_amount'],
                'items' => $lineItems,
            ]);

            $this->orders->update($orderId, [
                'fulfillor_order_id' => $response['orderId'] ?? ($response['order']['orderId'] ?? null),
                'fulfillor_synced_at' => date('Y-m-d H:i:s'),
                'fulfillor_sync_error' => $unmapped
                    ? 'Order created, but some items were skipped (no Fulfillor mapping): ' . implode(', ', $unmapped)
                    : null,
            ]);
        } catch (\Throwable $e) {
            $this->recordSyncError($orderId, $e->getMessage());
        }
    }

    /**
     * Polls Fulfillor for one order's current status and applies it locally. A no-op if
     * the order was never pushed or Fulfillor isn't configured.
     */
    public function pullOrderStatus(int $orderId): void
    {
        if (!$this->client->isConfigured()) {
            return;
        }

        $order = $this->orders->find($orderId);
        if (!$order || !$order['fulfillor_order_id']) {
            return;
        }

        try {
            $response = $this->fetchOrder($orderId, (string)$order['fulfillor_order_id']);
            $this->applyProviderUpdate($orderId, $order, $response);
        } catch (\Throwable $e) {
            $this->recordSyncError($orderId, $e->getMessage());
        }
    }

    /** @return array{checked:int, updated:int} */
    public function syncAllPending(): array
    {
        if (!$this->client->isConfigured()) {
            return ['checked' => 0, 'updated' => 0];
        }

        $orders = $this->orders->findSyncableFulfillorOrders();
        $updated = 0;

        foreach ($orders as $order) {
            $before = $order['status'];
            $this->pullOrderStatus((int)$order['id']);
            $after = $this->orders->find((int)$order['id'])['status'] ?? $before;
            if ($after !== $before) {
                $updated++;
            }
        }

        return ['checked' => count($orders), 'updated' => $updated];
    }

    /**
     * Tells Fulfillor to cancel an order we cancelled locally, so the warehouse doesn't
     * ship it. Returns null on success (or when there's nothing to cancel there), or the
     * error message — the caller still cancels locally and surfaces the message so an
     * admin can cancel it by hand in Fulfillor.
     */
    public function cancelInFulfillor(int $orderId, string $reason): ?string
    {
        $order = $this->orders->find($orderId);
        if (!$order || !$order['fulfillor_order_id'] || !$this->client->isConfigured()) {
            return null;
        }

        try {
            $this->client->updateOrder((string)$order['fulfillor_order_id'], [
                'statusId' => 'OrderCancelled',
                'orderMessage' => 'Cancelled by store: ' . $reason,
            ]);
            $this->safeUpdate($orderId, [
                'fulfillor_synced_at' => date('Y-m-d H:i:s'),
                'fulfillor_sync_error' => null,
            ]);
            return null;
        } catch (\Throwable $e) {
            $message = 'Could not cancel in Fulfillor — cancel it there manually before it ships. (' . $e->getMessage() . ')';
            $this->recordSyncError($orderId, $message);
            return $message;
        }
    }

    public function applyWebhookUpdate(string $externalOrderId, array $payload): void
    {
        $order = $this->orders->findBy('order_number', $externalOrderId);
        if (!$order) {
            return;
        }

        $this->applyProviderUpdate((int)$order['id'], $order, $payload);
    }

    /**
     * GET with a fallback for the order-id format. The create response returns a bare
     * orderId ("100462"), but on the live account GET only accepts the id with its
     * order-part suffix ("…-01") for some orders. Try as stored, then with "-01"; if
     * the suffixed form is what works, store it so later polls go straight there.
     */
    private function fetchOrder(int $orderId, string $fulfillorOrderId): array
    {
        try {
            return $this->client->getOrder($fulfillorOrderId);
        } catch (FulfillorApiException $e) {
            $notFound = in_array($e->getStatusCode(), [400, 404], true);
            if (!$notFound || preg_match('/-\d{2}$/', $fulfillorOrderId)) {
                throw $e;
            }
        }

        $suffixed = $fulfillorOrderId . '-01';
        $response = $this->client->getOrder($suffixed);
        $this->safeUpdate($orderId, ['fulfillor_order_id' => $suffixed]);
        return $response;
    }

    /**
     * Shared by the pull and push paths. Takes the most advanced state reported by
     * either the order status or its shipments, and only ever moves an order forward.
     */
    private function applyProviderUpdate(int $orderId, array $order, array $payload): void
    {
        if (in_array($order['status'], self::TERMINAL_STATUSES, true)) {
            return;
        }

        $providerOrder = $payload['order'] ?? $payload;
        $orderStatus = (string)($providerOrder['status'] ?? $providerOrder['statusId'] ?? '');
        $fulfillments = is_array($providerOrder['fulfillments'] ?? null) ? $providerOrder['fulfillments'] : [];

        $data = ['fulfillor_synced_at' => date('Y-m-d H:i:s')];
        $unknown = [];

        // Carrier/tracking from the most recent fulfillment that has them.
        foreach ($fulfillments as $fulfillment) {
            if (!empty($fulfillment['carrierPartyId'])) {
                $data['carrier'] = (string)$fulfillment['carrierPartyId'];
            }
            foreach ((array)($fulfillment['packages'] ?? []) as $package) {
                if (!empty($package['trackingCode'])) {
                    $data['tracking_number'] = (string)$package['trackingCode'];
                }
            }
        }

        // Most advanced reported state.
        $target = null;
        if ($orderStatus !== '') {
            if (array_key_exists($orderStatus, self::ORDER_STATUS_MAP)) {
                $target = self::ORDER_STATUS_MAP[$orderStatus];
            } else {
                $unknown[] = "order status '{$orderStatus}'";
            }
        }
        $shipStatuses = [];
        if ($target !== 'cancelled') {
            foreach ($fulfillments as $fulfillment) {
                $shipStatus = (string)($fulfillment['status'] ?? '');
                if ($shipStatus === '') {
                    continue;
                }
                $shipStatuses[] = $shipStatus;
                if (!array_key_exists($shipStatus, self::SHIPMENT_STATUS_MAP)) {
                    $unknown[] = "shipment status '{$shipStatus}'";
                    continue;
                }
                $target = $this->moreAdvanced($target, self::SHIPMENT_STATUS_MAP[$shipStatus]);
            }
            if (strcasecmp((string)($providerOrder['fulfillmentStatus'] ?? ''), 'Fulfilled') === 0) {
                $target = $this->moreAdvanced($target, 'shipped');
            }
        }

        $note = null;
        $newStatus = null;

        if ($target === 'cancelled') {
            if ($order['status'] === 'shipped') {
                // Cancelled after it left the warehouse: most likely a refused/undeliverable
                // parcel coming back (RTO). Don't silently flip it — flag for a human.
                $data['fulfillor_sync_error'] = "Fulfillor reports this shipped order as {$orderStatus} — possible return to origin (RTO). Check with Fulfillor and update the order manually.";
            } else {
                $newStatus = 'cancelled';
                $data['cancellation_reason'] = ($order['cancellation_reason'] ?? null) ?: "Cancelled in Fulfillor ({$orderStatus})";
                $note = "Synced from Fulfillor (status: {$orderStatus}).";
            }
        } elseif ($target !== null) {
            $currentRank = self::PROGRESS_RANK[$order['status']] ?? 0;
            if ((self::PROGRESS_RANK[$target] ?? 0) > $currentRank) {
                $newStatus = $target;
                $note = 'Synced from Fulfillor (' . implode(' / ', array_filter(array_merge([$orderStatus], array_unique($shipStatuses)))) . ').';
            }
        }

        if (!array_key_exists('fulfillor_sync_error', $data)) {
            $data['fulfillor_sync_error'] = $unknown
                ? 'Received unmapped Fulfillor ' . implode(', ', array_unique($unknown)) . ' — add it to FulfillmentService.'
                : null;
        }

        if ($newStatus !== null) {
            $data['status'] = $newStatus;
            if (in_array($newStatus, ['shipped', 'delivered'], true) && !$order['shipped_at']) {
                $data['shipped_at'] = date('Y-m-d H:i:s');
            }
            if ($newStatus === 'delivered' && !$order['delivered_at']) {
                $data['delivered_at'] = date('Y-m-d H:i:s');
            }
        }

        $this->orders->update($orderId, $data);

        if ($newStatus !== null) {
            $this->orders->addStatusHistory($orderId, $newStatus, $note, null);
        }
    }

    private function moreAdvanced(?string $a, string $b): string
    {
        if ($a === null) {
            return $b;
        }
        return (self::PROGRESS_RANK[$b] ?? 0) > (self::PROGRESS_RANK[$a] ?? 0) ? $b : $a;
    }

    // -------------------------------------------------------------- products

    /**
     * Finds this product in Fulfillor by SKU and stores its Fulfillor id. Read-only on
     * Fulfillor's side.
     */
    public function linkProductBySku(int $productId): array
    {
        $product = $this->requireProduct($productId);
        $match = $this->findFulfillorProductBySku((string)$product['sku']);
        if (!$match) {
            throw new DomainException("No product with SKU {$product['sku']} found in Fulfillor. Create it there first, or use \"Create in Fulfillor\".", 404);
        }

        $this->products->update($productId, ['fulfillor_product_id' => (string)$match['id']]);
        return ['fulfillor_product_id' => (string)$match['id'], 'created' => false];
    }

    /**
     * Creates this product in Fulfillor and stores the new id. If a product with the
     * same SKU already exists there, links to it instead of creating a duplicate.
     */
    public function createProductInFulfillor(int $productId): array
    {
        $product = $this->requireProduct($productId);
        if (!empty($product['fulfillor_product_id'])) {
            throw new DomainException('This product is already linked to Fulfillor product ' . $product['fulfillor_product_id'], 409);
        }

        $existing = $this->findFulfillorProductBySku((string)$product['sku']);
        if ($existing) {
            $this->products->update($productId, ['fulfillor_product_id' => (string)$existing['id']]);
            return ['fulfillor_product_id' => (string)$existing['id'], 'created' => false];
        }

        $payload = ['ownerPartyId' => $this->requireEnv('FULFILLOR_ORG_ID')] + $this->buildProductPayload($product);

        try {
            $response = $this->client->createProduct($payload);
        } catch (FulfillorApiException $e) {
            throw new DomainException($e->getMessage(), 502);
        }

        $newId = (string)($response['productId'] ?? ($response['product']['productId'] ?? ''));
        if ($newId === '') {
            throw new DomainException('Fulfillor did not return a product id', 502);
        }

        $this->products->update($productId, ['fulfillor_product_id' => $newId]);
        return ['fulfillor_product_id' => $newId, 'created' => true];
    }

    /**
     * Automatic push called after a product is created or edited in admin: creates it in
     * Fulfillor (or links an existing one with the same SKU) if it isn't linked yet,
     * otherwise PUTs the current name/description/price/weight/SKU. Best-effort, like
     * pushOrder — never throws, so a Fulfillor outage can't block saving a product; the
     * outcome lands in products.fulfillor_synced_at / fulfillor_sync_error instead.
     * No-op until Fulfillor is configured.
     */
    public function syncProduct(int $productId): void
    {
        if (!$this->client->isConfigured()) {
            return;
        }

        try {
            $product = $this->requireProduct($productId);
            $fulfillorId = trim((string)($product['fulfillor_product_id'] ?? ''));

            if ($fulfillorId === '') {
                $this->createProductInFulfillor($productId);
            } else {
                try {
                    $this->client->updateProduct($fulfillorId, $this->buildProductPayload($product));
                } catch (FulfillorApiException $e) {
                    throw new DomainException($e->getMessage(), 502);
                }
            }

            $this->products->update($productId, [
                'fulfillor_synced_at' => date('Y-m-d H:i:s'),
                'fulfillor_sync_error' => null,
            ]);
        } catch (\Throwable $e) {
            error_log("Fulfillor product sync failed for product {$productId}: " . $e->getMessage());
            try {
                $this->products->update($productId, ['fulfillor_sync_error' => mb_substr($e->getMessage(), 0, 1000)]);
            } catch (\Throwable $ignored) {
                // Recording the error is itself best-effort (e.g. migration not run yet).
            }
        }
    }

    /** Shared create/update body — Fulfillor's PUT takes the same fields minus ownerPartyId. */
    private function buildProductPayload(array $product): array
    {
        $payload = [
            'productName' => (string)$product['name_en'],
            'description' => ((string)($product['short_description_en'] ?? '')) ?: (string)$product['name_en'],
            'price' => (float)$product['price'],
            'currency' => 'AED',
            'identifications' => [['idType' => 'Sku', 'idValue' => (string)$product['sku']]],
        ];
        if (!empty($product['weight_kg'])) {
            $payload['weight'] = (float)$product['weight_kg'];
            $payload['weightUom'] = 'kg';
        }
        return $payload;
    }

    private function findFulfillorProductBySku(string $sku): ?array
    {
        if (!$this->client->isConfigured()) {
            throw new DomainException('Fulfillor is not configured', 503);
        }
        if ($sku === '') {
            throw new DomainException('Product has no SKU', 422);
        }

        try {
            $response = $this->client->listProducts([
                'ownerPartyId' => $this->requireEnv('FULFILLOR_ORG_ID'),
                'sku' => $sku,
                'countLimit' => 20,
                'pageIndex' => 0,
            ]);
        } catch (FulfillorApiException $e) {
            throw new DomainException($e->getMessage(), 502);
        }

        // The sku filter may be a partial match — only accept an exact one.
        foreach ((array)($response['products'] ?? []) as $candidate) {
            if (strcasecmp(trim((string)($candidate['sku'] ?? '')), trim($sku)) === 0) {
                return $candidate;
            }
        }
        return null;
    }

    private function requireProduct(int $productId): array
    {
        $product = $this->products->find($productId);
        if (!$product) {
            throw new DomainException('Product not found', 404);
        }
        return $product;
    }

    private function requireEnv(string $key): string
    {
        $value = trim((string)($_ENV[$key] ?? ''));
        if ($value === '') {
            throw new DomainException("{$key} is not set", 503);
        }
        return $value;
    }

    // ------------------------------------------------------------- inventory

    /**
     * Overwrites local stock for Fulfillor-linked, stock-tracked products with the
     * warehouse's available-to-promise (atp) count at FULFILLOR_FACILITY_ID, minus units
     * we've already sold but not yet sent to Fulfillor (those still count as available
     * on their side). Read-only on Fulfillor's side.
     *
     * @return array{checked:int, updated:int, skipped?:string}
     */
    public function syncInventory(): array
    {
        $orgId = trim((string)($_ENV['FULFILLOR_ORG_ID'] ?? ''));
        $facilityId = trim((string)($_ENV['FULFILLOR_FACILITY_ID'] ?? ''));
        if (!$this->client->isConfigured() || $orgId === '' || $facilityId === '') {
            return ['checked' => 0, 'updated' => 0, 'skipped' => 'FULFILLOR_* / FULFILLOR_FACILITY_ID not set'];
        }

        $products = $this->products->findFulfillorStockTracked();
        if (!$products) {
            return ['checked' => 0, 'updated' => 0];
        }

        $reserved = $this->products->quantitiesReservedNotSentToFulfillor();
        $updated = 0;

        foreach (array_chunk($products, 50) as $chunk) {
            $ids = array_values(array_unique(array_map(fn ($p) => (string)$p['fulfillor_product_id'], $chunk)));
            $response = $this->client->getInventory($orgId, $facilityId, $ids);

            $atpByProduct = [];
            foreach ((array)($response['inventoryList'] ?? []) as $row) {
                $pid = (string)($row['productId'] ?? '');
                $atpByProduct[$pid] = ($atpByProduct[$pid] ?? 0) + (int)($row['atp'] ?? 0);
            }

            foreach ($chunk as $product) {
                // Missing from the response = nothing available at that facility.
                $atp = $atpByProduct[(string)$product['fulfillor_product_id']] ?? 0;
                $quantity = max(0, $atp - ($reserved[(int)$product['id']] ?? 0));

                $status = $quantity > 0
                    ? 'in_stock'
                    : ($product['stock_status'] === 'backorder' ? 'backorder' : 'out_of_stock');

                if ((int)$product['stock_quantity'] !== $quantity || $product['stock_status'] !== $status) {
                    $this->products->update((int)$product['id'], [
                        'stock_quantity' => $quantity,
                        'stock_status' => $status,
                    ]);
                    $updated++;
                }
            }
        }

        return ['checked' => count($products), 'updated' => $updated];
    }

    // --------------------------------------------------------------- helpers

    /**
     * @return array{0: array<int, array{productId:string,quantity:int,unitAmount:float}>, 1: string[]}
     */
    private function buildLineItems(array $orderItems): array
    {
        $lineItems = [];
        $unmapped = [];

        foreach ($orderItems as $item) {
            $product = $item['product_id'] !== null ? $this->products->find((int)$item['product_id']) : null;
            $fulfillorProductId = $product['fulfillor_product_id'] ?? null;

            if (!$fulfillorProductId) {
                $unmapped[] = $item['sku'];
                continue;
            }

            $lineItems[] = [
                'productId' => $fulfillorProductId,
                'quantity' => (int)$item['quantity'],
                'unitAmount' => (float)$item['unit_price'],
            ];
        }

        return [$lineItems, $unmapped];
    }

    /**
     * Saves a failure on the order for admins to see. Never throws: it runs inside
     * catch blocks, and a throw here (e.g. fulfillor_* columns missing) would turn a
     * recorded best-effort failure into a 500. Falls back to the PHP error log.
     */
    private function recordSyncError(int $orderId, string $message): void
    {
        $this->safeUpdate($orderId, ['fulfillor_sync_error' => substr($message, 0, 500)], $message);
    }

    private function safeUpdate(int $orderId, array $data, ?string $context = null): void
    {
        try {
            $this->orders->update($orderId, $data);
        } catch (\Throwable $e) {
            error_log("Fulfillor: could not update order {$orderId}" . ($context ? " ({$context})" : '') . ": {$e->getMessage()}");
        }
    }
}
