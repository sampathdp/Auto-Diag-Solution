<?php

declare(strict_types=1);

namespace App\Core\Auth;

class TenantContext
{
    private static ?int $salonId = null;
    private static ?int $userId = null;
    private static bool $isSuperAdmin = false;

    public static function setTenantId(int $id): void
    {
        self::$salonId = $id;
    }

    public static function getTenantId(): ?int
    {
        return self::$salonId;
    }

    public static function setUserId(int $id): void
    {
        self::$userId = $id;
    }

    public static function getUserId(): ?int
    {
        return self::$userId;
    }

    private static ?int $branchId = null;

    public static function setBranchId(?int $id): void
    {
        self::$branchId = $id;
    }

    public static function getBranchId(): ?int
    {
        return self::$branchId;
    }

    public static function setSuperAdmin(bool $status): void
    {
        self::$isSuperAdmin = $status;
    }

    public static function isSuperAdmin(): bool
    {
        return self::$isSuperAdmin;
    }

    public static function clear(): void
    {
        self::$salonId = null;
        self::$branchId = null;
        self::$isSuperAdmin = false;
    }
}
