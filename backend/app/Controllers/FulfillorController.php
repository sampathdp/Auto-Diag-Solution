<?php

declare(strict_types=1);

namespace App\Controllers;

use App\Core\Request;
use App\Services\Fulfillment\FulfillmentService;

/**
 * Admin-triggered Fulfillor (3PL) actions: linking a product to its Fulfillor id,
 * creating it there, and pulling warehouse stock on demand. Order push/sync actions
 * live on OrderController.
 */
class FulfillorController extends BaseController
{
    private FulfillmentService $fulfillment;

    public function __construct()
    {
        $this->fulfillment = new FulfillmentService();
    }

    /** Looks the product up in Fulfillor by SKU (read-only there) and stores its id. */
    public function linkProduct(Request $request): void
    {
        $result = $this->fulfillment->linkProductBySku((int)$request->getParam('id'));
        $this->success($result, 'Linked to Fulfillor product ' . $result['fulfillor_product_id']);
    }

    /** Creates the product in Fulfillor (or links an existing one with the same SKU). */
    public function createProduct(Request $request): void
    {
        $result = $this->fulfillment->createProductInFulfillor((int)$request->getParam('id'));
        $this->success(
            $result,
            $result['created']
                ? 'Created in Fulfillor as product ' . $result['fulfillor_product_id']
                : 'Already existed in Fulfillor — linked to product ' . $result['fulfillor_product_id']
        );
    }

    /** Pulls available stock from the Fulfillor warehouse now instead of waiting for cron. */
    public function syncStock(Request $request): void
    {
        $this->success($this->fulfillment->syncInventory(), 'Stock synced from Fulfillor');
    }
}
