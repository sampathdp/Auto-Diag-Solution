<?php

declare(strict_types=1);

namespace App\Controllers;

use App\Core\Request;
use App\Exceptions\DomainException;
use App\Services\CheckoutService;

class CheckoutController extends BaseController
{
    private CheckoutService $service;

    public function __construct()
    {
        $this->service = new CheckoutService();
    }

    public function store(Request $request): void
    {
        $items = $request->input('items');
        if (!is_array($items)) {
            throw new DomainException('Cart items are required', 422);
        }

        $order = $this->service->placeOrder(
            (int)$request->user->id,
            (int)$request->input('shipping_address_id'),
            $items
        );

        $this->success($order, 'Order placed successfully', 201);
    }
}
