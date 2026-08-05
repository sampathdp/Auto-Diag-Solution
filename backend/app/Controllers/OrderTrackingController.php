<?php

declare(strict_types=1);

namespace App\Controllers;

use App\Core\Request;
use App\Exceptions\DomainException;
use App\Services\AccountOrderService;

/** Public (unauthenticated) order status lookup for the link sent in the order-confirmation
 * email. Ownership is proven by the token, not a session — see AccountOrderService::showByTrackingToken. */
class OrderTrackingController extends BaseController
{
    private AccountOrderService $service;

    public function __construct()
    {
        $this->service = new AccountOrderService();
    }

    public function show(Request $request): void
    {
        $orderNumber = (string)$request->getParam('orderNumber');
        $token = (string)($request->input('token') ?? '');
        if ($orderNumber === '' || $token === '') {
            throw new DomainException('Order not found', 404);
        }

        $this->success($this->service->showByTrackingToken($orderNumber, $token));
    }
}
