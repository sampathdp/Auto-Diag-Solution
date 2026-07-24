<?php

declare(strict_types=1);

namespace App\Services;

use App\Core\Database\DatabaseManager;
use App\Exceptions\DomainException;
use App\Repositories\OrderRepository;
use App\Repositories\PaymentTransactionRepository;
use App\Repositories\ProductRepository;
use App\Repositories\UserRepository;

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
    private UserRepository $users;

    public function __construct()
    {
        $this->addresses = new AddressService();
        $this->products = new ProductRepository();
        $this->orders = new OrderRepository();
        $this->paymentTransactions = new PaymentTransactionRepository();
        $this->accountOrders = new AccountOrderService();
        $this->users = new UserRepository();
    }

    public function placeOrder(int $userId, int $shippingAddressId, array $items): array
    {
        if (!$items) {
            throw new DomainException('Your cart is empty', 422);
        }

        // Throws DomainException(404) if the address doesn't exist / isn't owned by this user.
        $address = $this->addresses->find($userId, $shippingAddressId);

        return $this->createOrder($userId, $shippingAddressId, $address, $items);
    }

    /**
     * Guest checkout — no session/JWT, just a name/email/phone and a shipping address
     * typed in at checkout. If the email already belongs to a registered account, the
     * order is attached to that account (matches how most storefronts handle it: email
     * is the natural identity key, not a secret) rather than creating a duplicate row,
     * which would collide with the unique index on users.email anyway. Otherwise a
     * lightweight guest user is created — password NULL (already nullable, see the
     * OAuth migration), is_guest = 1 — so every downstream admin/customer-account query
     * keyed on orders.user_id keeps working unchanged instead of needing a parallel
     * "guest order" code path.
     */
    public function placeGuestOrder(array $customer, array $shippingInput, array $items): array
    {
        if (!$items) {
            throw new DomainException('Your cart is empty', 422);
        }

        $name = trim((string)($customer['name'] ?? ''));
        $email = strtolower(trim((string)($customer['email'] ?? '')));
        $phone = trim((string)($customer['phone'] ?? ''));

        if ($name === '' || $email === '' || $phone === '') {
            throw new DomainException('Name, email, and phone are required', 422);
        }
        if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
            throw new DomainException('A valid email address is required', 422);
        }

        $userId = $this->resolveGuestUserId($name, $email, $phone);
        $address = $this->buildGuestAddress($name, $phone, $shippingInput);

        return $this->createOrder($userId, null, $address, $items);
    }

    private function resolveGuestUserId(string $name, string $email, string $phone): int
    {
        $existing = $this->users->findByEmail($email);
        if ($existing) {
            return (int)$existing['id'];
        }

        return $this->users->create([
            'name' => $name,
            'email' => $email,
            'phone' => $phone,
            'password' => null,
            'role' => 'customer',
            'is_guest' => 1,
        ]);
    }

    /** Same shape as AddressService::shape() — snapshotted straight onto the order, never written to customer_addresses. */
    private function buildGuestAddress(string $name, string $phone, array $input): array
    {
        $emirate = (string)($input['emirate'] ?? 'Dubai');
        $area = trim((string)($input['area'] ?? ''));
        $building = trim((string)($input['building'] ?? ''));

        if ($area === '' || $building === '') {
            throw new DomainException('Area and building are required', 422);
        }

        return [
            'label' => 'Guest Checkout',
            'name' => $name,
            'phone' => $phone,
            'emirate' => $emirate,
            'city' => $emirate,
            'area' => $area,
            'street' => trim((string)($input['street'] ?? '')),
            'building' => $building,
            'apartment' => trim((string)($input['apartment'] ?? '')) ?: null,
            'instructions' => trim((string)($input['instructions'] ?? '')) ?: null,
        ];
    }

    private function createOrder(int $userId, ?int $shippingAddressId, array $address, array $items): array
    {
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
                'status' => 'pending_vin_verification',
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
                'pending_vin_verification',
                'Mock payment received — order confirmed automatically. Replace with the real payment gateway once available. '
                    . 'Held for VIN verification before being sent to the 3PL.',
                null
            );

            DatabaseManager::commit();
        } catch (\Throwable $e) {
            DatabaseManager::rollBack();
            throw $e;
        }

        // Deliberately does NOT push to Fulfillor here: the order sits in
        // 'pending_vin_verification' until an admin manually checks the vehicle
        // model/VIN in the admin panel and clicks "Approve & Send to 3PL"
        // (OrderService::approveForFulfillment), to catch mismatches before they
        // become returns.
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
