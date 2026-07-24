<?php

declare(strict_types=1);

namespace App\Services\Fulfillment;

use App\Repositories\OrderRepository;
use App\Repositories\ProductRepository;

/**
 * Hands a placed order off to Fulfillor (external fulfillment/WMS platform, built on
 * Moqui — see Fulfillor_API_v1_Reference.pdf) so their warehouse can pick, pack, and
 * ship it, and keeps our order status in sync with theirs afterward. Deliberately
 * best-effort and non-blocking throughout: until FULFILLOR_BASE_URL/FULFILLOR_API_KEY
 * are set, every method here no-ops, and even once they are, an outage on Fulfillor's
 * side must never stop a customer's checkout or an admin's "Approve & Send to 3PL"
 * action from succeeding locally. Failures/skips are recorded on the order
 * (fulfillor_sync_error) instead of thrown — callers (OrderService::
 * approveForFulfillment(), the fulfillor:sync console command, the webhook receiver)
 * never need to catch anything.
 *
 * Per the reference doc, v1 is a plain pull-only REST API (List/Get/Create/Update
 * orders) — there is no documented outbound-webhook capability. Polling (pullOrderStatus()
 * / syncAllPending(), scheduled via console.php's fulfillor:sync) is therefore the
 * confirmed way status changes make it back to us; applyWebhookUpdate() exists as a
 * defensive extra in case Fulfillor adds/enables push callbacks later, not because
 * their v1 docs promise one.
 */
class FulfillmentService
{
    /**
     * Fulfillor statusId -> our orders.status. Fulfillor runs on Moqui, whose enum ids
     * are PascalCase without underscores (confirmed by the reference doc's own
     * conventions table: ProductActive, AstAvailable, ShipInput, PtAsset, ScWeb, ...).
     * Of the order statuses, only OrderPlaced and OrderApproved are actually
     * documented; OrderShipped/OrderCompleted/OrderCancelled/OrderRejected below follow
     * the same confirmed "Order" + PascalCase-verb pattern but are inferred, not
     * confirmed — verify these against a real order's lifecycle once live and adjust.
     * Payment-side statuses (refunded) are deliberately not mapped here: Fulfillor
     * reports fulfillment/shipping state, not refunds.
     */
    private const STATUS_MAP = [
        'OrderPlaced' => 'processing',     // confirmed — Fulfillor's initial status right after Create Order
        'OrderApproved' => 'processing',   // confirmed
        'OrderShipped' => 'shipped',       // inferred
        'OrderCompleted' => 'delivered',   // inferred
        'OrderCancelled' => 'cancelled',   // inferred
        'OrderRejected' => 'cancelled',    // inferred
    ];

    // Once a local order is one of these, a stale/out-of-order webhook or poll result
    // must never regress it.
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
                $this->orders->update($orderId, [
                    'fulfillor_sync_error' => 'No line items are mapped to a Fulfillor product id yet '
                        . '(set products.fulfillor_product_id for: ' . implode(', ', $unmapped) . ').',
                ]);
                return;
            }

            $response = $this->client->createOrder([
                'ownerPartyId' => (string)($_ENV['FULFILLOR_ORG_ID'] ?? ''),
                'customer' => [
                    'email' => $order['customer_email'] ?? '',
                    'name' => $shipping['name'] ?? ($order['customer_name'] ?? ''),
                    'phone' => $shipping['phone'] ?? '',
                    'address1' => trim(($shipping['building'] ?? '') . ' ' . ($shipping['street'] ?? '')),
                    'city' => $shipping['city'] ?? '',
                    'state' => $shipping['emirate'] ?? '',
                    'country' => 'AE',
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
                'fulfillor_order_id' => $response['orderId'] ?? null,
                'fulfillor_synced_at' => date('Y-m-d H:i:s'),
                'fulfillor_sync_error' => $unmapped
                    ? 'Order created, but some items were skipped (no Fulfillor mapping): ' . implode(', ', $unmapped)
                    : null,
            ]);
        } catch (\Throwable $e) {
            $this->orders->update($orderId, [
                'fulfillor_sync_error' => substr($e->getMessage(), 0, 500),
            ]);
        }
    }

    /**
     * Pull-based sync — polls Fulfillor for one order's current status and applies it
     * locally. Called per-order by syncAllPending() (console/cron) and by the admin's
     * manual "Sync Now" action; a no-op if the order was never pushed or Fulfillor
     * isn't configured.
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
            $response = $this->client->getOrder($order['fulfillor_order_id']);
            $this->applyProviderUpdate($orderId, $order, $response);
        } catch (\Throwable $e) {
            $this->orders->update($orderId, [
                'fulfillor_sync_error' => substr($e->getMessage(), 0, 500),
            ]);
        }
    }

    /**
     * Runs pullOrderStatus() for every order still awaiting a terminal status from
     * Fulfillor. This is the half of "keep status in sync automatically" that works
     * without needing Fulfillor to support outbound webhooks — but it only actually
     * runs automatically once something calls it on a schedule (see console.php's
     * `fulfillor:sync` command and the cron entry documented alongside it).
     *
     * @return array{checked:int, updated:int}
     */
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
     * Push-based sync — the other half. If/when Fulfillor calls our webhook receiver
     * with a status change, this looks the order up by the externalId we originally
     * sent them (our order_number) and applies the same update logic pullOrderStatus()
     * uses, so both paths can never disagree on what a given payload means.
     */
    public function applyWebhookUpdate(string $externalOrderId, array $payload): void
    {
        $order = $this->orders->findBy('order_number', $externalOrderId);
        if (!$order) {
            return;
        }

        $this->applyProviderUpdate((int)$order['id'], $order, $payload);
    }

    /**
     * Shared by the pull and push paths. $payload is Fulfillor's order representation —
     * GET /orders/{id} wraps everything under an "order" key (confirmed by the
     * reference doc's Get/List Order samples), so that's unwrapped first. Status reads
     * as "status" on GET/List responses but "statusId" on the Update Order request/
     * response — checked defensively in that order. Carrier comes from the first
     * fulfillment's carrierPartyId (confirmed field); tracking number is inferred from
     * fulfillments[].packages[].trackingCode by symmetry with the (confirmed)
     * incomingShipment.packages[].trackingCode shape, since no example order in the
     * docs has a populated packages array to confirm against directly.
     */
    private function applyProviderUpdate(int $orderId, array $order, array $payload): void
    {
        if (in_array($order['status'], self::TERMINAL_STATUSES, true)) {
            return;
        }

        $providerOrder = $payload['order'] ?? $payload;
        $providerStatus = (string)($providerOrder['status'] ?? $providerOrder['statusId'] ?? '');
        $localStatus = self::STATUS_MAP[$providerStatus] ?? null;

        $data = ['fulfillor_synced_at' => date('Y-m-d H:i:s')];

        $fulfillment = $providerOrder['fulfillments'][0] ?? [];
        $carrier = $fulfillment['carrierPartyId'] ?? null;
        $trackingNumber = $fulfillment['packages'][0]['trackingCode'] ?? null;
        if ($trackingNumber) {
            $data['tracking_number'] = $trackingNumber;
        }
        if ($carrier) {
            $data['carrier'] = $carrier;
        }

        if ($localStatus === null) {
            // Unrecognized/unmapped provider status — record it for visibility instead
            // of guessing at a local status. Add it to STATUS_MAP once confirmed.
            $data['fulfillor_sync_error'] = $providerStatus !== ''
                ? "Received unmapped Fulfillor status '{$providerStatus}' — add it to FulfillmentService::STATUS_MAP."
                : null;
            $this->orders->update($orderId, $data);
            return;
        }

        $data['fulfillor_sync_error'] = null;
        if ($localStatus === 'shipped' && !$order['shipped_at']) {
            $data['shipped_at'] = date('Y-m-d H:i:s');
        }
        if ($localStatus === 'delivered' && !$order['delivered_at']) {
            $data['delivered_at'] = date('Y-m-d H:i:s');
        }

        $statusChanged = $localStatus !== $order['status'];
        if ($statusChanged) {
            $data['status'] = $localStatus;
        }

        $this->orders->update($orderId, $data);

        if ($statusChanged) {
            $this->orders->addStatusHistory($orderId, $localStatus, "Synced from Fulfillor (status: {$providerStatus}).", null);
        }
    }

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
}
