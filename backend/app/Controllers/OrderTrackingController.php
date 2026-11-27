<?php

declare(strict_types=1);

namespace App\Controllers;

use App\Core\Request;
use App\Exceptions\DomainException;
use App\Services\AccountOrderService;
use App\Services\RateLimiter;

/** Public (unauthenticated) order status lookup for the link sent in the order-confirmation
 * email. Ownership is proven by the token, not a session — see AccountOrderService::showByTrackingToken. */
class OrderTrackingController extends BaseController
{
    private const PROOF_IP_MAX_ATTEMPTS = 20;
    private const PROOF_IP_LOCKOUT_SECONDS = 3600;

    private AccountOrderService $service;

    public function __construct()
    {
        $this->service = new AccountOrderService();
    }

    public function show(Request $request): void
    {
        [$orderNumber, $token] = $this->credentials($request);
        $this->success($this->service->showByTrackingToken($orderNumber, $token));
    }

    /** POST /orders/track/{orderNumber}/payment-proof?token=…  (multipart: file) */
    public function uploadPaymentProof(Request $request): void
    {
        $ip = $request->getIp();
        $lockedSeconds = RateLimiter::secondsUntilUnlocked('payment-proof:ip', $ip);
        if ($lockedSeconds > 0) {
            throw new DomainException('Too many uploads. Try again in ' . (int)ceil($lockedSeconds / 60) . ' minute(s).', 429);
        }
        RateLimiter::hit('payment-proof:ip', $ip, self::PROOF_IP_MAX_ATTEMPTS, self::PROOF_IP_LOCKOUT_SECONDS);

        [$orderNumber, $token] = $this->credentials($request);
        $files = $request->getFiles();
        $order = $this->service->uploadPaymentProofByToken($orderNumber, $token, $files['file'] ?? null);
        $this->success($order, 'Receipt uploaded. We will verify your payment shortly.', 201);
    }

    /** @return array{0:string,1:string} */
    private function credentials(Request $request): array
    {
        $orderNumber = (string)$request->getParam('orderNumber');
        $token = (string)($request->input('token') ?? '');
        if ($orderNumber === '' || $token === '') {
            throw new DomainException('Order not found', 404);
        }
        return [$orderNumber, $token];
    }
}
