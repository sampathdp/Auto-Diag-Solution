<?php

declare(strict_types=1);

namespace App\Services\B2B;

use App\Repositories\ProductRepository;

/**
 * The one place that decides what a product costs for a given buyer.
 *
 * Rules (INTEGRATION_ARCHITECTURE.md §3):
 * 1. Not a dealer, or a dealer who can't buy wholesale right now: retail price.
 * 2. Dealer who can buy wholesale, quantity at or above the product's minimum: wholesale.
 * 3. Same dealer below the minimum: retail, flagged with the quantity needed.
 * 4. Product with no wholesale price yet (legacy rows before the backfill): retail.
 *
 * Every lookup is batched: one product query however many lines.
 */
final class PricingService
{
    private ProductRepository $products;

    public function __construct()
    {
        $this->products = new ProductRepository();
    }

    /**
     * Catalogue display for a dealer: retail and wholesale side by side. Products that
     * aren't active (or don't exist) are left out.
     *
     * @param int[] $productIds
     * @return array<int, array{retail:float, wholesale:?float, min_qty:int, savings:?float, savings_percent:?float}>
     */
    public function catalogPrices(?array $profile, array $productIds): array
    {
        $wholesaleAllowed = DealerContext::canBuyWholesale($profile);
        $out = [];
        foreach ($this->products->pricesForIds($productIds) as $id => $row) {
            $retail = (float)$row['price'];
            $wholesale = $wholesaleAllowed && $row['wholesale_price'] !== null ? (float)$row['wholesale_price'] : null;
            $savings = $wholesale !== null ? round($retail - $wholesale, 2) : null;
            $out[$id] = [
                'retail' => $retail,
                'wholesale' => $wholesale,
                'min_qty' => self::minQty($row),
                'savings' => $savings,
                'savings_percent' => $savings !== null && $retail > 0 ? round($savings / $retail * 100, 1) : null,
            ];
        }
        return $out;
    }

    /**
     * Prices order or cart lines. Lines for products that aren't active are dropped;
     * callers that must refuse those (checkout) check availability themselves.
     *
     * @param array<int, array{product_id:int, quantity:int}> $lines
     * @return array<int, array{product_id:int, quantity:int, unit_price:float, retail_unit_price:float, pricing_type:string, min_qty_for_wholesale:?int}>
     */
    public function priceLines(?array $profile, array $lines): array
    {
        $rows = $this->products->pricesForIds(array_column($lines, 'product_id'));
        $wholesaleAllowed = DealerContext::canBuyWholesale($profile);

        $out = [];
        foreach ($lines as $line) {
            $id = (int)$line['product_id'];
            $qty = max(1, (int)$line['quantity']);
            $row = $rows[$id] ?? null;
            if ($row === null) {
                continue;
            }
            $out[] = ['product_id' => $id, 'quantity' => $qty] + self::unitPrice($row, $qty, $wholesaleAllowed);
        }
        return $out;
    }

    /** @return array{unit_price:float, retail_unit_price:float, pricing_type:string, min_qty_for_wholesale:?int} */
    public static function unitPrice(array $row, int $qty, bool $wholesaleAllowed): array
    {
        $retail = (float)$row['price'];
        $result = [
            'unit_price' => $retail,
            'retail_unit_price' => $retail,
            'pricing_type' => 'retail',
            'min_qty_for_wholesale' => null,
        ];
        if (!$wholesaleAllowed || $row['wholesale_price'] === null) {
            return $result;
        }

        $minQty = self::minQty($row);
        if ($qty < $minQty) {
            $result['min_qty_for_wholesale'] = $minQty;
            return $result;
        }

        $result['unit_price'] = (float)$row['wholesale_price'];
        $result['pricing_type'] = 'wholesale';
        return $result;
    }

    private static function minQty(array $row): int
    {
        return max(1, (int)($row['wholesale_min_qty'] ?? 1));
    }
}
