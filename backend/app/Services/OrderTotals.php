<?php

declare(strict_types=1);

namespace App\Services;

/**
 * Order money arithmetic, shared by checkout and quotations so a quoted total is worked
 * out exactly like a checkout total.
 *
 * Per line: `vat_inclusive` products already have VAT in their price (the tax portion is
 * backed out of it); `vat_inclusive = false` products are charged exactly their listed
 * price with no VAT added. `subtotal` is always pre-tax. Shipping is taxed at the VAT
 * rate. A discount comes off the pre-tax subtotal; VAT stays computed on the undiscounted
 * line prices, as checkout has always done.
 */
final class OrderTotals
{
    public const VAT_RATE = 5.0;

    /**
     * @param array<int, array{line_total:float|string, vat_inclusive:bool|int, free_shipping?:bool|int}> $lines
     * @return array{subtotal:float, vat:float, all_free_shipping:bool}
     */
    public static function lines(array $lines): array
    {
        $subtotal = 0.0;
        $vat = 0.0;
        $allFree = true;
        foreach ($lines as $line) {
            $lineTotal = (float)$line['line_total'];
            if ($line['vat_inclusive']) {
                $exclusive = round($lineTotal / (1 + self::VAT_RATE / 100), 2);
                $lineVat = round($lineTotal - $exclusive, 2);
            } else {
                $exclusive = $lineTotal;
                $lineVat = 0.0;
            }
            $subtotal += $exclusive;
            $vat += $lineVat;
            if (empty($line['free_shipping'])) {
                $allFree = false;
            }
        }

        return ['subtotal' => round($subtotal, 2), 'vat' => round($vat, 2), 'all_free_shipping' => $allFree];
    }

    /**
     * Adds shipping (and its VAT) and takes off the discount.
     *
     * @return array{vat:float, total:float}
     */
    public static function finish(float $subtotal, float $lineVat, float $shipping, float $discount): array
    {
        $vat = $lineVat;
        if ($shipping > 0) {
            $vat = round($vat + ($shipping * (self::VAT_RATE / 100)), 2);
        }
        $discountedSubtotal = round($subtotal - $discount, 2);

        return ['vat' => $vat, 'total' => round($discountedSubtotal + $shipping + $vat, 2)];
    }
}
