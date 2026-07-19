<?php

declare(strict_types=1);

namespace App\Controllers;

use App\Core\Request;
use App\Services\WishlistService;

class AccountWishlistController extends BaseController
{
    private WishlistService $service;

    public function __construct()
    {
        $this->service = new WishlistService();
    }

    public function index(Request $request): void
    {
        $this->success($this->service->list((int)$request->user->id));
    }

    public function store(Request $request): void
    {
        $this->service->add((int)$request->user->id, (int)$request->getParam('productId'));
        $this->success(null, 'Added to wishlist');
    }

    public function destroy(Request $request): void
    {
        $this->service->remove((int)$request->user->id, (int)$request->getParam('productId'));
        $this->success(null, 'Removed from wishlist');
    }

    public function clear(Request $request): void
    {
        $this->service->clear((int)$request->user->id);
        $this->success(null, 'Wishlist cleared');
    }
}
