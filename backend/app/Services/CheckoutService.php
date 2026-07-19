<?php

declare(strict_types=1);

namespace App\Services;

use App\Core\Database\DatabaseManager;
use App\Exceptions\DomainException;
use App\Repositories\OrderRepository;
use App\Repositories\PaymentTransactionRepository;
use App\Repositories\ProductRepository;
use App\Services\Fulfillment\FulfillmentService;

/**
 * Places a real order from the cart, but with a stubbed-out payment step: the client's
 * payment gateway isn't wired up yet, so every checkout is auto-confirmed as "paid" via
 * a 'mock' provider rather than actually charging a card. Swapping in a real gateway
 * later only touches confirmPayment() below — everything else (order/items/stock/
 * status history) is the real, permanent checkout flow.
 */
class CheckoutService
{
    private const FREE_SHIPPING_THRESHOLD = 500.0;
    private const SHIPPING_FEE = 20.0;
    private const VAT_RATE = 5.0;

    private AddressService $addresses;
    private ProductRepository $products;
    private OrderRepository $orders;
    private PaymentTransactionRepository $paymentTransactions;
    private AccountOrderService $accountOrders;
    private FulfillmentService $fulfillment;

    public function __construct()
    {
        $this->addresses = new AddressService();
        $this->products = new ProductRepository();
        $this->orders = new OrderRepository();
        $this->paymentTransactions = new PaymentTransactionRepository();
        $this->accountOrders = new AccountOrderService();
        $this->fulfillment = new FulfillmentService();
    }

    public function placeOrder(int $userId, int $shippingAddressId, array $items): array
    {
        if (!$items) {
            throw new DomainException('Your cart is empty', 422);
        }

        // Throws DomainException(404) if the address doesn't exist / isn't owned by this user.
        $address = $this->addresses->find($userId, $shippingAddressId);

        [$lineItems, $stockUpdates] = $this->resolveLineItems($items);

        $subtotal = array_sum(array_column($lineItems, 'line_total'));
        $shipping = $subtotal > 0 && $subtotal < self::FREE_SHIPPING_THRESHOLD ? self::SHIPPING_FEE : 0.0;
        $vatAmount = round(($subtotal + $shipping) * (self::VAT_RATE / 100), 2);
        $total = $subtotal + $shipping + $vatAmount;

        $orderNumber = $this->generateOrderNumber();
        $paymentReference = 'MOCK-' . strtoupper(bin2hex(random_bytes(6)));

        DatabaseManager::beginTransaction();
        try {
            $orderId = $this->orders->create([
                'order_number' => $orderNumber,
                'user_id' => $userId,
                'status' => 'processing',
                'payment_status' => 'paid',
                'payment_method' => 'mock',
                'payment_reference' => $paymentReference,
                'subtotal' => $subtotal,
                'vat_rate' => self::VAT_RATE,
                'vat_amount' => $vatAmount,
                'shipping_amount' => $shipping,
                'discount_amount' => 0,
                'total' => $total,
                'currency' => 'AED',
                'shipping_address_id' => $shippingAddressId,
                'shipping_snapshot' => json_encode($address, JSON_UNESCAPED_UNICODE),
            ]);

            foreach ($lineItems as $item) {
                DatabaseManager::query(
                    "INSERT INTO order_items (order_id, product_id, sku, name_en, name_ar, unit_price, quantity, line_total)
                     VALUES (:order_id, :product_id, :sku, :name_en, :name_ar, :unit_price, :quantity, :line_total)",
                    [
                        'order_id' => $orderId,
                        'product_id' => $item['product_id'],
                        'sku' => $item['sku'],
                        'name_en' => $item['name_en'],
                        'name_ar' => $item['name_ar'],
                        'unit_price' => $item['unit_price'],
                        'quantity' => $item['quantity'],
                        'line_total' => $item['line_total'],
                    ]
                );
            }

            foreach ($stockUpdates as $productId => $update) {
                $this->products->update($productId, $update);
            }

            $this->paymentTransactions->create([
                'order_id' => $orderId,
                'provider' => 'mock',
                'provider_reference' => $paymentReference,
                'type' => 'payment',
                'status' => 'succeeded',
                'amount' => $total,
                'currency' => 'AED',
            ]);

            $this->orders->addStatusHistory(
                $orderId,
                'processing',
                'Mock payment received — order confirmed automatically. Replace with the real payment gateway once available.',
                null
            );

            DatabaseManager::commit();
        } catch (\Throwable $e) {
            DatabaseManager::rollBack();
            throw $e;
        }

        // Outside the transaction and after commit — an external HTTP call has no
        // business holding DB locks, and a Fulfillor outage must never roll back an
        // order the customer has already been told succeeded. Best-effort by design:
        // failures are recorded on the order, never thrown back to the customer.
        $this->fulfillment->pushOrder($orderId);

        return $this->accountOrders->show($userId, $orderId);
    }

    /**
     * @return array{0: array<int, array{product_id:int,sku:string,name_en:string,name_ar:string,unit_price:float,quantity:int,line_total:float}>, 1: array<int, array{stock_quantity:int,stock_status:string}>}
     */
    private function resolveLineItems(array $items): array
    {
        $lineItems = [];
        $stockUpdates = [];

        foreach ($items as $item) {
            $productId = (int)($item['product_id'] ?? 0);
            $quantity = max(1, (int)($item['quantity'] ?? 1));
            if ($productId <= 0) {
                continue;
            }

            $product = $this->products->find($productId);
            if (!$product || $product['status'] !== 'active') {
                throw new DomainException('One of the items in your cart is no longer available', 422);
            }
            if ($product['stock_status'] === 'out_of_stock') {
                throw new DomainException("{$product['name_en']} is out of stock", 422);
            }
            if (!empty($product['track_inventory']) && (int)$product['stock_quantity'] < $quantity) {
                throw new DomainException("Only {$product['stock_quantity']} left of {$product['name_en']}", 422);
            }

            $unitPrice = (float)$product['price'];
            $lineItems[] = [
                'product_id' => $productId,
                'sku' => $product['sku'],
                'name_en' => $product['name_en'],
                'name_ar' => $product['name_ar'],
                'unit_price' => $unitPrice,
                'quantity' => $quantity,
                'line_total' => round($unitPrice * $quantity, 2),
            ];

            if (!empty($product['track_inventory'])) {
                $newQuantity = max(0, (int)$product['stock_quantity'] - $quantity);
                $stockUpdates[$productId] = [
                    'stock_quantity' => $newQuantity,
                    'stock_status' => $newQuantity === 0 ? 'out_of_stock' : $product['stock_status'],
                ];
            }
        }

        if (!$lineItems) {
            throw new DomainException('Your cart is empty', 422);
        }

        return [$lineItems, $stockUpdates];
    }

    private function generateOrderNumber(): string
    {
        return 'ORD-' . date('ymd') . '-' . strtoupper(substr(bin2hex(random_bytes(4)), 0, 6));
    }
}
