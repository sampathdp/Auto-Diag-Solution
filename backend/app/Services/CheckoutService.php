<?php

declare(strict_types=1);

namespace App\Services;

use App\Exceptions\DomainException;
use App\Repositories\OrderRepository;
use App\Repositories\ProductRepository;
use App\Repositories\UserRepository;
use App\Services\B2B\DealerContext;
use App\Services\B2B\OrderPlacementService;
use App\Services\B2B\PaymentMethodPolicy;
use App\Services\B2B\PricingService;
use App\Services\B2B\QuotationService;

/**
 * Places an order from the cart, for retail customers, guests and dealers.
 *
 * The server decides everything that affects money: the channel (B2B only for the
 * signed-in user's own approved dealer profile), each line's price (PricingService),
 * the totals, and whether the chosen payment method is allowed (PaymentMethodPolicy).
 * Nothing is charged here: COD, bank transfer and cheque orders start unpaid and an
 * admin confirms the payment later (OrderPaymentService). The writing itself happens in
 * OrderPlacementService.
 *
 * A dealer who needs a quotation (first order, or an admin's force_quotation flag) gets
 * one instead of an order: the cart is priced exactly the same way and handed to
 * QuotationService, and nothing is charged or taken from stock until the quotation is
 * approved and the dealer accepts it.
 */
class CheckoutService
{
    private const VAT_RATE = OrderTotals::VAT_RATE;

    private AddressService $addresses;
    private ProductRepository $products;
    private OrderRepository $orders;
    private AccountOrderService $accountOrders;
    private UserRepository $users;
    private ShippingService $shipping;
    private PromoCodeService $promoCodes;
    private PaymentMethodPolicy $paymentPolicy;
    private OrderPlacementService $placement;

    public function __construct()
    {
        $this->addresses = new AddressService();
        $this->products = new ProductRepository();
        $this->orders = new OrderRepository();
        $this->accountOrders = new AccountOrderService();
        $this->users = new UserRepository();
        $this->shipping = new ShippingService();
        $this->promoCodes = new PromoCodeService();
        $this->paymentPolicy = new PaymentMethodPolicy();
        $this->placement = new OrderPlacementService();
    }

    /** Payment method tiles for a checkout: the B2B list for an active dealer, retail otherwise (and for guests). */
    public function paymentMethodsFor(?int $userId): array
    {
        $profile = $userId !== null ? DealerContext::profileFor($userId) : null;
        $channel = DealerContext::isActiveDealer($profile) ? PaymentMethodPolicy::CHANNEL_B2B : PaymentMethodPolicy::CHANNEL_RETAIL;
        $methods = $this->paymentPolicy->methods($channel);
        $bankTransferLive = (bool)array_filter($methods, fn (array $m) => $m['code'] === 'bank_transfer' && $m['available']);

        return [
            'channel' => $channel,
            // The dealer's checkout sends a quotation request instead of placing an order.
            'quotation_required' => DealerContext::needsQuotation($profile),
            'methods' => $methods,
            // Shown when the buyer picks bank transfer; the order number becomes the reference.
            'bank_transfer' => $bankTransferLive
                ? ['accounts' => $this->paymentPolicy->bankAccounts(), 'instructions' => $this->paymentPolicy->bankTransferInstructions()]
                : null,
        ];
    }

    public function placeOrder(int $userId, int $shippingAddressId, array $items, ?string $promoCode, string $paymentMethod): array
    {
        if (!$items) {
            throw new DomainException('Your cart is empty', 422);
        }

        // Throws DomainException(404) if the address doesn't exist / isn't owned by this user.
        $address = $this->addresses->find($userId, $shippingAddressId);

        return $this->createOrder($userId, $shippingAddressId, $address, $items, $promoCode, $paymentMethod, DealerContext::profileFor($userId));
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
    public function placeGuestOrder(array $customer, array $shippingInput, array $items, ?string $promoCode, string $paymentMethod): array
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

        // Always retail: an email address proves nothing, so guest checkout never gets
        // dealer prices or B2B payment methods, even with a dealer's email.
        return $this->createOrder($userId, null, $address, $items, $promoCode, $paymentMethod, null);
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

    private function createOrder(
        int $userId,
        ?int $shippingAddressId,
        array $address,
        array $items,
        ?string $promoCode,
        string $paymentMethod,
        ?array $dealerProfile
    ): array {
        // The channel comes from the database, never the browser: an approved, active
        // dealer's own checkout is B2B; everything else (including guest checkout, even
        // with a dealer's email) is retail.
        $isB2b = DealerContext::isActiveDealer($dealerProfile);
        $channel = $isB2b ? PaymentMethodPolicy::CHANNEL_B2B : PaymentMethodPolicy::CHANNEL_RETAIL;
        $this->paymentPolicy->assertAllowed($paymentMethod, $channel);
        $needsQuotation = $isB2b && DealerContext::needsQuotation($dealerProfile);

        [$lineItems, $stockUpdates] = $this->resolveLineItems($items, $isB2b && DealerContext::canBuyWholesale($dealerProfile));

        // VAT per line (vat_inclusive backs the tax out of the price; VAT-exclusive lines
        // carry none), the pre-tax subtotal, and whether every line ships free: OrderTotals.
        $lineTotals = OrderTotals::lines($lineItems);
        $subtotal = $lineTotals['subtotal'];
        $hasWholesaleLine = (bool)array_filter($lineItems, fn (array $item) => $item['pricing_type'] === 'wholesale');

        // Free if every item in the order is individually free-shipping-eligible; otherwise
        // priced by the address's shipping district (ShippingService falls back to the flat
        // fee/threshold when there's no district or the district has no rate configured).
        $districtId = isset($address['district_id']) && $address['district_id'] !== null ? (int)$address['district_id'] : null;
        $shipping = $lineTotals['all_free_shipping'] ? 0.0 : $this->shipping->calculateShipping($districtId, $subtotal);

        if ($needsQuotation) {
            // A quoted price is set by the team, so a promo code has nothing to apply to.
            if ($promoCode !== null && trim($promoCode) !== '') {
                throw new DomainException("Promo codes can't be used on a quotation request. Remove the code and send the request again.", 422);
            }
            $quotation = (new QuotationService())->createFromCheckout(
                $dealerProfile,
                $userId,
                $shippingAddressId,
                $address,
                $lineItems,
                $shipping,
                $paymentMethod
            );
            return ['kind' => 'quotation', 'quotation' => $quotation];
        }

        $vatAmount = OrderTotals::finish($subtotal, $lineTotals['vat'], $shipping, 0.0)['vat'];

        // Promo code discount/commission — resolved and re-validated entirely server-side
        // from the code string alone; the frontend never supplies a discount/commission
        // amount or a sales_rep_id. Discount is taken off the pre-tax product subtotal
        // (VAT here is computed on the undiscounted line prices — adjusting VAT itself for
        // a discount is out of scope for this pass). The usage is consumed atomically in
        // OrderPlacementService so two checkouts can't both take the last remaining use.
        $promo = null;
        $salesRep = null;
        $discountAmount = 0.0;
        $commissionAmount = 0.0;
        $baseAmount = 0.0;
        if ($promoCode !== null && trim($promoCode) !== '') {
            // Dealer prices are already discounted; a promo on top would sell below the
            // wholesale price the business set.
            if ($hasWholesaleLine) {
                throw new DomainException("Promo codes can't be combined with dealer prices", 422);
            }
            $result = $this->promoCodes->validateForCheckout($promoCode, $subtotal);
            $promo = $result['promo'];
            $salesRep = $result['sales_rep'];
            $discountAmount = $result['discount_amount'];
        }

        $discountedSubtotal = round($subtotal - $discountAmount, 2);
        $total = OrderTotals::finish($subtotal, $lineTotals['vat'], $shipping, $discountAmount)['total'];

        if ($promo !== null) {
            $baseAmount = $this->promoCodes->resolveCommissionBaseAmount($promo, $subtotal, $discountedSubtotal, $total);
            $commissionAmount = $this->promoCodes->calculateCommission($promo, $baseAmount);
        }

        $orderNumber = $this->generateOrderNumber();
        $paymentStatus = PaymentMethodPolicy::initialStatus($paymentMethod);
        // The order number is the transfer reference the buyer quotes to the bank.
        $paymentReference = match ($paymentMethod) {
            'mock' => 'MOCK-' . strtoupper(bin2hex(random_bytes(6))),
            'bank_transfer' => $orderNumber,
            default => null,
        };

        $orderId = $this->placement->place(
            [
                'order_number' => $orderNumber,
                'user_id' => $userId,
                'channel' => $channel,
                'dealer_profile_id' => $isB2b ? (int)$dealerProfile['id'] : null,
                'status' => 'pending_vin_verification',
                'payment_status' => $paymentStatus,
                'payment_method' => $paymentMethod,
                'payment_reference' => $paymentReference,
                'subtotal' => $subtotal,
                'vat_rate' => self::VAT_RATE,
                'vat_amount' => $vatAmount,
                'shipping_amount' => $shipping,
                'discount_amount' => $discountAmount,
                'promo_code_id' => $promo !== null ? (int)$promo['id'] : null,
                'promo_code' => $promo !== null ? $promo['code'] : null,
                'sales_rep_id' => $salesRep !== null ? (int)$salesRep['id'] : null,
                'discount_type' => $promo !== null ? $promo['discount_type'] : null,
                'discount_value' => $promo !== null ? $promo['discount_value'] : null,
                'commission_type' => $promo !== null ? $promo['commission_type'] : null,
                'commission_value' => $promo !== null ? $promo['commission_value'] : null,
                'commission_amount' => $commissionAmount,
                'total' => $total,
                'currency' => 'AED',
                'shipping_address_id' => $shippingAddressId,
                'shipping_snapshot' => json_encode($address, JSON_UNESCAPED_UNICODE),
            ],
            $lineItems,
            $stockUpdates,
            $promo !== null
                ? ['promo' => $promo, 'sales_rep' => $salesRep, 'base_amount' => $baseAmount, 'commission_amount' => $commissionAmount]
                : null,
            // Only the e2e mock moves money at checkout. COD, bank transfer and cheque get
            // their payment_transactions row when an admin confirms the payment.
            $paymentMethod === 'mock'
                ? [
                    'provider' => 'mock',
                    'provider_reference' => $paymentReference,
                    'type' => 'payment',
                    'status' => 'succeeded',
                    'amount' => $total,
                    'currency' => 'AED',
                ]
                : null,
            [
                'status' => 'pending_vin_verification',
                'note' => self::placedNote($paymentMethod) . ' Held for VIN verification before being sent to the 3PL.',
            ]
        );

        $this->sendConfirmationEmail($userId, $orderId, $orderNumber, $total, $lineItems, $paymentMethod);

        // Deliberately does NOT push to Fulfillor here: the order sits in
        // 'pending_vin_verification' until an admin manually checks the vehicle
        // model/VIN in the admin panel and clicks "Approve & Send to 3PL"
        // (OrderService::approveForFulfillment), to catch mismatches before they
        // become returns.
        return $this->accountOrders->show($userId, $orderId);
    }

    public static function placedNote(string $paymentMethod): string
    {
        return match ($paymentMethod) {
            'cod' => 'Order placed — cash on delivery, to be collected when delivered.',
            'bank_transfer' => 'Order placed — awaiting bank transfer. Verify the payment before sending to the 3PL.',
            'cheque' => 'Order placed — payment by cheque, marked paid when the cheque clears.',
            'mock' => 'Test payment received (mock, non-production only).',
            default => 'Order placed.',
        };
    }

    /**
     * Generates the guest-viewable tracking link and emails the confirmation — for both
     * guest and logged-in checkouts, since $userId always resolves to a real users row
     * with a name/email (see resolveGuestUserId) either way.
     *
     * @param array<int, array{name_en:string,sku:string,quantity:int,unit_price:float,line_total:float}> $lineItems
     */
    public function sendConfirmationEmail(int $userId, int $orderId, string $orderNumber, float $total, array $lineItems, string $paymentMethod): void
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
            $trackingUrl,
            [
                'method' => $paymentMethod,
                'label' => PaymentMethodPolicy::label($paymentMethod),
                'bank_transfer' => $paymentMethod === 'bank_transfer' ? $this->paymentPolicy->bankTransferDetails($orderNumber) : null,
            ]
        );
    }

    /**
     * Loads, checks and prices each line. Prices always come from the product row via
     * PricingService (retail, or wholesale for a dealer at or above the minimum
     * quantity); any price the browser sends is ignored.
     *
     * @return array{0: array<int, array{product_id:int,sku:string,name_en:string,name_ar:string,unit_price:float,retail_unit_price:float,pricing_type:string,quantity:int,line_total:float,vat_inclusive:bool,free_shipping:bool}>, 1: array<int, array{quantity:int,name_en:string}>}
     */
    public function resolveLineItems(array $items, bool $wholesaleAllowed): array
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

            $price = PricingService::unitPrice($product, $quantity, $wholesaleAllowed);
            $unitPrice = $price['unit_price'];
            $lineItems[] = [
                'product_id' => $productId,
                'sku' => $product['sku'],
                'name_en' => $product['name_en'],
                'name_ar' => $product['name_ar'],
                'unit_price' => $unitPrice,
                'retail_unit_price' => $price['retail_unit_price'],
                'pricing_type' => $price['pricing_type'],
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

    public function generateOrderNumber(): string
    {
        return 'ORD-' . date('ymd') . '-' . strtoupper(substr(bin2hex(random_bytes(4)), 0, 6));
    }
}
