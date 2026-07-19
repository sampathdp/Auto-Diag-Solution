<?php

declare(strict_types=1);

namespace App\Services\Fulfillment;

use App\Repositories\OrderRepository;
use App\Repositories\ProductRepository;

/**
 * Hands a placed order off to Fulfillor (external fulfillment/WMS platform) so their
 * warehouse can pick, pack, and ship it. Deliberately best-effort and non-blocking:
 * FULFILLOR_BASE_URL/FULFILLOR_API_KEY aren't set yet, and even once they are, an
 * outage on Fulfillor's side must never stop a customer's checkout from succeeding
 * locally. Failures/skips are recorded on the order (fulfillor_sync_error) instead of
 * thrown — CheckoutService calls pushOrder() and never needs to catch anything.
 */
class FulfillmentService
{
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
