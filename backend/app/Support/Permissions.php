<?php

declare(strict_types=1);

namespace App\Support;

/**
 * The catalogue of grantable staff permissions.
 *
 * Super admins (users.is_super_admin = 1) hold every permission implicitly. Any other
 * admin holds only the rows granted in user_permissions. Routes that need one of these
 * use [PermissionMiddleware::class, '<permission>']; services doing financial work
 * re-check with PermissionService::userHas() so a revoked permission takes effect on the
 * next request instead of when the access token expires.
 */
final class Permissions
{
    public const STAFF_MANAGE = 'staff.manage';
    public const SETTINGS_B2B = 'b2b.settings.manage';

    public const B2B_APPLICATIONS_VIEW   = 'b2b.applications.view';
    public const B2B_APPLICATIONS_REVIEW = 'b2b.applications.review';
    public const B2B_DEALERS_SUSPEND     = 'b2b.dealers.suspend';
    public const B2B_DOCUMENTS_VIEW      = 'b2b.documents.view';
    public const B2B_PRICING_MANAGE      = 'b2b.pricing.manage';
    public const B2B_QUOTATIONS_MANAGE   = 'b2b.quotations.manage';
    public const B2B_QUOTATIONS_APPROVE  = 'b2b.quotations.approve';
    public const B2B_CREDIT_MANAGE       = 'b2b.credit.manage';
    public const B2B_PAYMENTS_RECORD     = 'b2b.payments.record';
    public const B2B_PAYMENTS_VERIFY     = 'b2b.payments.verify';
    public const B2B_LEDGER_ADJUST       = 'b2b.ledger.adjust';
    public const B2B_REPORTS_VIEW        = 'b2b.reports.view';

    /** @return array<int, array{key:string,label:string,group:string}> */
    public static function catalogue(): array
    {
        return [
            ['key' => self::STAFF_MANAGE, 'label' => 'Manage staff accounts and permissions', 'group' => 'Administration'],
            ['key' => self::SETTINGS_B2B, 'label' => 'Change B2B and payment settings', 'group' => 'Administration'],
            ['key' => self::B2B_APPLICATIONS_VIEW, 'label' => 'View dealer applications', 'group' => 'Dealers'],
            ['key' => self::B2B_APPLICATIONS_REVIEW, 'label' => 'Approve or reject dealer applications', 'group' => 'Dealers'],
            ['key' => self::B2B_DEALERS_SUSPEND, 'label' => 'Suspend and reactivate dealers', 'group' => 'Dealers'],
            ['key' => self::B2B_DOCUMENTS_VIEW, 'label' => 'View dealer identity and licence documents', 'group' => 'Dealers'],
            ['key' => self::B2B_PRICING_MANAGE, 'label' => 'Set wholesale prices', 'group' => 'Pricing'],
            ['key' => self::B2B_QUOTATIONS_MANAGE, 'label' => 'Edit and reply to quotations', 'group' => 'Quotations'],
            ['key' => self::B2B_QUOTATIONS_APPROVE, 'label' => 'Approve or reject quotations', 'group' => 'Quotations'],
            ['key' => self::B2B_CREDIT_MANAGE, 'label' => 'Change dealer credit limits and terms', 'group' => 'Finance'],
            ['key' => self::B2B_PAYMENTS_RECORD, 'label' => 'Record dealer payments and cheques', 'group' => 'Finance'],
            ['key' => self::B2B_PAYMENTS_VERIFY, 'label' => 'Clear or bounce payments', 'group' => 'Finance'],
            ['key' => self::B2B_LEDGER_ADJUST, 'label' => 'Post ledger adjustments and credit notes', 'group' => 'Finance'],
            ['key' => self::B2B_REPORTS_VIEW, 'label' => 'View B2B reports', 'group' => 'Finance'],
        ];
    }

    /** @return string[] */
    public static function keys(): array
    {
        return array_column(self::catalogue(), 'key');
    }

    public static function isKnown(string $permission): bool
    {
        return in_array($permission, self::keys(), true);
    }
}
