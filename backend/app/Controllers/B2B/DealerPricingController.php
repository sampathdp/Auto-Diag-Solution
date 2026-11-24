<?php

declare(strict_types=1);

namespace App\Controllers\B2B;

use App\Controllers\BaseController;
use App\Core\Request;
use App\Exceptions\DomainException;
use App\Services\B2B\DealerContext;
use App\Services\B2B\PricingService;

/**
 * Wholesale prices for the storefront. The public catalogue endpoints never carry
 * wholesale data (they're cacheable and SEO-facing), so a signed-in dealer's browser
 * asks here for the products on screen. Dealer standing is read from the database on
 * every call, so a suspended or expired dealer gets a 403 straight away.
 */
class DealerPricingController extends BaseController
{
    private const MAX_IDS = 100;

    /** POST /dealer/pricing  {product_ids: int[]} */
    public function prices(Request $request): void
    {
        $profile = DealerContext::profileFor((int)$request->user->id);
        if (!DealerContext::canBuyWholesale($profile)) {
            throw new DomainException('Wholesale prices are only available to approved dealers', 403);
        }

        $ids = $request->input('product_ids');
        if (!is_array($ids)) {
            throw new DomainException('product_ids must be a list', 422);
        }
        $ids = array_slice(array_values(array_unique(array_map('intval', $ids))), 0, self::MAX_IDS);

        $prices = (new PricingService())->catalogPrices($profile, $ids);

        // Keyed by product id; an object even when empty so the client can index it.
        $this->success(['prices' => (object)$prices]);
    }
}
