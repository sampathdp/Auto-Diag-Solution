<?php

declare(strict_types=1);

namespace App\Services\B2B;

use App\Repositories\DealerProfileRepository;

/**
 * Who is this user as a dealer? Read from the database on every request (memoised for
 * the request only), never from the JWT or the browser, so a suspension or expiry takes
 * effect immediately. Pricing, B2B checkout and every dealer-only endpoint ask here.
 */
final class DealerContext
{
    /** @var array<int, array|null> */
    private static array $cache = [];

    public static function profileFor(int $userId): ?array
    {
        if (!array_key_exists($userId, self::$cache)) {
            self::$cache[$userId] = (new DealerProfileRepository())->findByUser($userId);
        }
        return self::$cache[$userId];
    }

    public static function forget(int $userId): void
    {
        unset(self::$cache[$userId]);
    }

    /** Approved, inside its activation window. Wholesale access additionally needs wholesale_enabled. */
    public static function isActiveDealer(?array $profile): bool
    {
        if (!$profile || $profile['status'] !== 'approved') {
            return false;
        }
        $now = time();
        if (!empty($profile['activated_at']) && strtotime((string)$profile['activated_at']) > $now) {
            return false;
        }
        if (!empty($profile['expires_at']) && strtotime((string)$profile['expires_at']) <= $now) {
            return false;
        }
        return true;
    }

    public static function canBuyWholesale(?array $profile): bool
    {
        return self::isActiveDealer($profile) && (int)($profile['wholesale_enabled'] ?? 0) === 1;
    }

    /**
     * Must this dealer's checkout go through a quotation (INTEGRATION_ARCHITECTURE.md §4)?
     * Yes while the first-order requirement is on and no quotation has been converted
     * yet, or whenever an admin has set force_quotation. first_order_completed_at is set
     * only by a successful conversion, so a rejected or expired first quotation keeps
     * the requirement.
     */
    public static function needsQuotation(?array $profile): bool
    {
        if (!self::isActiveDealer($profile)) {
            return false;
        }
        if ((int)($profile['force_quotation'] ?? 0) === 1) {
            return true;
        }
        return (int)($profile['requires_quotation'] ?? 0) === 1 && empty($profile['first_order_completed_at']);
    }

    /**
     * What the storefront may know about the user's dealer standing. Deliberately small:
     * no business details, no document info.
     */
    public static function summary(?array $profile): ?array
    {
        if (!$profile) {
            return null;
        }
        $active = self::isActiveDealer($profile);
        return [
            'status' => $profile['status'],
            'dealer_code' => $profile['status'] === 'approved' || $profile['status'] === 'suspended' ? $profile['dealer_code'] : null,
            'is_active' => $active,
            'wholesale' => $active && (int)$profile['wholesale_enabled'] === 1,
            'needs_quotation' => self::needsQuotation($profile),
            'not_yet_active' => $profile['status'] === 'approved' && !$active
                && !empty($profile['activated_at']) && strtotime((string)$profile['activated_at']) > time(),
            'expired' => $profile['status'] === 'approved' && !empty($profile['expires_at'])
                && strtotime((string)$profile['expires_at']) <= time(),
        ];
    }
}
