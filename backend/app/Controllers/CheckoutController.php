<?php

declare(strict_types=1);

namespace App\Controllers;

use App\Core\Request;
use App\Exceptions\DomainException;
use App\Services\CheckoutService;
use App\Services\RateLimiter;

class CheckoutController extends BaseController
{
    // Guest checkout is unauthenticated and creates a users row like registration does —
    // same abuse class (account/order spam), so it gets the same per-IP shape.
    private const GUEST_IP_MAX_ATTEMPTS = 10;
    private const GUEST_IP_LOCKOUT_SECONDS = 3600; // 1 hour

    private CheckoutService $service;

    public function __construct()
    {
        $this->service = new CheckoutService();
    }

    /** GET /account/checkout/payment-methods — dealers get the B2B list. */
    public function paymentMethods(Request $request): void
    {
        $this->success($this->service->paymentMethodsFor((int)$request->user->id));
    }

    /** GET /checkout/payment-methods — guest checkout is always retail. */
    public function guestPaymentMethods(Request $request): void
    {
        $this->success($this->service->paymentMethodsFor(null));
    }

    public function store(Request $request): void
    {
        $items = $request->input('items');
        if (!is_array($items)) {
            throw new DomainException('Cart items are required', 422);
        }

        $promoCode = $request->input('promo_code');
        $order = $this->service->placeOrder(
            (int)$request->user->id,
            (int)$request->input('shipping_address_id'),
            $items,
            $promoCode !== null ? (string)$promoCode : null,
            trim((string)($request->input('payment_method') ?? ''))
        );

        // A dealer who needs a quotation gets {kind:'quotation', quotation} instead of an order.
        $isQuotation = ($order['kind'] ?? null) === 'quotation';
        $this->success($order, $isQuotation ? 'Quotation request sent' : 'Order placed successfully', 201);
    }

    public function guestStore(Request $request): void
    {
        $ip = $request->getIp();
        $lockedSeconds = RateLimiter::secondsUntilUnlocked('guest-checkout:ip', $ip);
        if ($lockedSeconds > 0) {
            throw new DomainException('Too many attempts. Try again in ' . (int)ceil($lockedSeconds / 60) . ' minute(s).', 429);
        }
        RateLimiter::hit('guest-checkout:ip', $ip, self::GUEST_IP_MAX_ATTEMPTS, self::GUEST_IP_LOCKOUT_SECONDS);

        $items = $request->input('items');
        if (!is_array($items)) {
            throw new DomainException('Cart items are required', 422);
        }

        $promoCode = $request->input('promo_code');
        $order = $this->service->placeGuestOrder(
            (array)$request->input('customer'),
            (array)$request->input('shipping'),
            $items,
            $promoCode !== null ? (string)$promoCode : null,
            trim((string)($request->input('payment_method') ?? ''))
        );

        $this->success($order, 'Order placed successfully', 201);
    }
}
