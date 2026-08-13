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
    private const VAT_RATE = 5.0;

    private AddressService $addresses;
    private ProductRepository $products;
    private OrderRepository $orders;
    private PaymentTransactionRepository $paymentTransactions;
    private AccountOrderService $accountOrders;
    private UserRepository $users;
    private ShippingService $shipping;

    public function __construct()
    {
        $this->addresses = new AddressService();
        $this->products = new ProductRepository();
        $this->orders = new OrderRepository();
        $this->paymentTransactions = new PaymentTransactionRepository();
        $this->accountOrders = new AccountOrderService();
        $this->users = new UserRepository();
        $this->shipping = new ShippingService();
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
            // Optional — an unrecognized/omitted district just falls back to the flat rate
            // in ShippingService rather than blocking checkout over a shipping-cost detail.
            'district_id' => !empty($input['district_id']) ? (int)$input['district_id'] : null,
        ];
    }

    private function createOrder(int $userId, ?int $shippingAddressId, array $address, array $items): array
    {
        [$lineItems, $stockUpdates] = $this->resolveLineItems($items);

        // Per line item: `vat_inclusive` products already have VAT baked into their price
        // (back the tax portion out of it instead of taxing it again); `vat_inclusive =
        // false` ("VAT exclusive") products aren't taxed at all — charged exactly at their
        // listed price, no 5% added on top. `subtotal` is always shown pre-tax so the
        // breakdown adds up the same way regardless of a line's vat_inclusive flag.
        $subtotal = 0.0;
        $vatAmount = 0.0;
        $allLinesFreeShipping = true;
        foreach ($lineItems as $item) {
            if ($item['vat_inclusive']) {
                $exclusive = round($item['line_total'] / (1 + self::VAT_RATE / 100), 2);
                $itemVat = round($item['line_total'] - $exclusive, 2);
            } else {
                $exclusive = $item['line_total'];
                $itemVat = 0.0;
            }
            $subtotal += $exclusive;
            $vatAmount += $itemVat;
            if (!$item['free_shipping']) {
                $allLinesFreeShipping = false;
            }
        }
        $subtotal = round($subtotal, 2);
        $vatAmount = round($vatAmount, 2);

        // Free if every item in the order is individually free-shipping-eligible; otherwise
        // priced by the address's shipping district (ShippingService falls back to the flat
        // fee/threshold when there's no district or the district has no rate configured).
        $districtId = isset($address['district_id']) && $address['district_id'] !== null ? (int)$address['district_id'] : null;
        $shipping = $allLinesFreeShipping ? 0.0 : $this->shipping->calculateShipping($districtId, $subtotal);
        if ($shipping > 0) {
            $vatAmount = round($vatAmount + ($shipping * (self::VAT_RATE / 100)), 2);
        }
        $total = round($subtotal + $shipping + $vatAmount, 2);

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
                // Atomic, guarded decrement — closes the race where two concurrent
                // checkouts both read stock as sufficient and both proceed to buy the
                // last unit. If we lose the race, abort the whole order (transaction
                // rolls back the order/items/payment rows already staged above).
                if (!$this->products->decrementStock($productId, $update['quantity'])) {
                    throw new DomainException(
                        "{$update['name_en']} sold out while we were placing your order — please remove it and try again",
                        409
                    );
                }
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

        $this->sendConfirmationEmail($userId, $orderId, $orderNumber, $total, $lineItems);

        // Deliberately does NOT push to Fulfillor here: the order sits in
        // 'pending_vin_verification' until an admin manually checks the vehicle
        // model/VIN in the admin panel and clicks "Approve & Send to 3PL"
        // (OrderService::approveForFulfillment), to catch mismatches before they
        // become returns.
        return $this->accountOrders->show($userId, $orderId);
    }

    /**
     * Generates the guest-viewable tracking link and emails the confirmation — for both
     * guest and logged-in checkouts, since $userId always resolves to a real users row
     * with a name/email (see resolveGuestUserId) either way.
     *
     * @param array<int, array{name_en:string,sku:string,quantity:int,unit_price:float,line_total:float}> $lineItems
     */
    private function sendConfirmationEmail(int $userId, int $orderId, string $orderNumber, float $total, array $lineItems): void
    {
        $user = $this->users->find($userId);
        if (!$user || empty($user['email'])) {
            return;
        }

        $rawToken = bin2hex(random_bytes(32));
        $this->orders->setTrackingTokenHash($orderId, hash('sha256', $rawToken));

        $frontendUrl = rtrim((string)($_ENV['FRONTEND_URL'] ?? 'http://localhost:3000'), '/');
        $trackingUrl = "{$frontendUrl}/en/track-order?order=" . urlencode($orderNumber) . '&token=' . urlencode($rawToken);

        OrderMailService::sendOrderConfirmation(
            ['order_number' => $orderNumber, 'currency' => 'AED', 'total' => $total],
            $lineItems,
            (string)$user['name'],
            (string)$user['email'],
            $trackingUrl
        );
    }

    /**
     * @return array{0: array<int, array{product_id:int,sku:string,name_en:string,name_ar:string,unit_price:float,quantity:int,line_total:float,vat_inclusive:bool,free_shipping:bool}>, 1: array<int, array{stock_quantity:int,stock_status:string}>}
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
                'vat_inclusive' => (bool)$product['vat_inclusive'],
                'free_shipping' => (bool)$product['free_shipping'],
            ];

            if (!empty($product['track_inventory'])) {
                // Just the quantity to decrement, not a precomputed new value — the
                // actual write happens atomically in decrementStock() inside the
                // transaction, so a concurrent order can't be silently overwritten.
                $stockUpdates[$productId] = [
                    'quantity' => $quantity,
                    'name_en' => $product['name_en'],
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
