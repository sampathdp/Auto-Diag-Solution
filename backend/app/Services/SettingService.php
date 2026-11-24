<?php

declare(strict_types=1);

namespace App\Services;

use App\Core\Database\DatabaseManager;
use App\Exceptions\DomainException;
use App\Repositories\SettingRepository;
use App\Support\Permissions;

class SettingService
{
    private const VALID_TYPES = ['string', 'number', 'boolean', 'json'];

    // Seeded core settings the storefront/checkout depend on (VAT calc, branding, ...) —
    // deletable in principle, but doing so silently breaks unrelated features, so block it.
    private const PROTECTED_KEYS = [
        'vat_rate', 'currency', 'site_name', 'support_email',
        'whatsapp_number', 'ga_tracking_id', 'stripe_publishable_key',
        'announcement_en', 'announcement_ar',
        'contact_address_en', 'contact_address_ar', 'contact_phone', 'contact_email',
        'contact_hours_en', 'contact_hours_ar',
        'contact_blurb_en', 'contact_blurb_ar',
    ];

    // Storefront announcement bar text. **double asterisks** render bold.
    // Also holds the footer / contact-page details (group 'contact').
    private const ANNOUNCEMENT_DEFAULTS = [
        'announcement_en' => 'Free UAE-wide delivery on orders over **AED 500**',
        'announcement_ar' => 'توصيل مجاني لجميع أنحاء الإمارات للطلبات فوق **500 درهم**',
        'contact_address_en' => 'Warehouse 14, Al Quoz Industrial Area 3, Dubai, UAE',
        'contact_address_ar' => 'مستودع 14، المنطقة الصناعية 3 – القوز، دبي، الإمارات',
        'contact_phone' => '+971 4 123 4567',
        'contact_email' => 'parts@asil.ae',
        'contact_hours_en' => 'Sat–Thu, 8:00–20:00 GST',
        'contact_hours_ar' => 'السبت–الخميس، 8:00–20:00 بتوقيت الخليج',
        'contact_blurb_en' => 'Genuine and OEM auto parts, sourced globally and distributed across the UAE from our Dubai facility since 2015.',
        'contact_blurb_ar' => 'قطع غيار أصلية ومعادلة للأصلية، مصدرها عالمي وموزعة في جميع أنحاء الإمارات من مرفقنا في دبي منذ 2015.',
        'whatsapp_number' => '+971 50 123 4567',
    ];

    /**
     * Payment and B2B settings. They change how money is taken, so editing them needs
     * the b2b.settings.manage permission (super admins hold it), not just the admin role.
     * Rows are created on first use so production needs no seeder run.
     * Live payment methods are COD and Bank Transfer; the card gateway is on hold.
     *
     * @var array<string, array{0:string,1:string,2:string}> key => [default value, type, group]
     */
    private const RESTRICTED_DEFAULTS = [
        'payment_online_card_enabled' => ['0', 'boolean', 'payments'],
        'retail_payment_methods' => ['["cod","bank_transfer"]', 'json', 'payments'],
        'payment_bank_accounts' => ['[{"bank_name":"","account_holder":"","account_number":"","iban":"","swift":"","branch":""}]', 'json', 'payments'],
        'payment_bank_transfer_instructions' => ['Use your order number as the transfer reference and upload the transfer receipt. Your order is processed once the payment is verified.', 'string', 'payments'],
        'b2b_registration_enabled' => ['1', 'boolean', 'b2b'],
        'b2b_first_order_requires_quotation' => ['1', 'boolean', 'b2b'],
        'b2b_default_credit_enabled' => ['0', 'boolean', 'b2b'],
        'b2b_default_credit_period_days' => ['30', 'number', 'b2b'],
        'b2b_quotation_expiry_days' => ['14', 'number', 'b2b'],
        // The credit period starts when a B2B order is delivered (decision 2026-11-22).
        'b2b_invoice_trigger' => ['delivered', 'string', 'b2b'],
        'b2b_payment_methods' => ['["cod","bank_transfer","cheque","credit"]', 'json', 'b2b'],
        'b2b_sales_team_emails' => ['[]', 'json', 'b2b'],
        'b2b_max_document_mb' => ['5', 'number', 'b2b'],
        'b2b_terms_html' => ['', 'string', 'b2b'],
    ];

    private SettingRepository $repo;
    private PermissionService $permissions;

    public function __construct()
    {
        $this->repo = new SettingRepository();
        $this->permissions = new PermissionService();
    }

    public static function isRestrictedKey(string $key): bool
    {
        return isset(self::RESTRICTED_DEFAULTS[$key])
            || str_starts_with($key, 'b2b_')
            || str_starts_with($key, 'payment_')
            || $key === 'retail_payment_methods';
    }

    /** @param string[] $keys */
    private function authorizeKeys(array $keys, ?int $actorId): void
    {
        foreach ($keys as $key) {
            if (self::isRestrictedKey((string)$key)) {
                if ($actorId === null) {
                    throw new DomainException('Payment and B2B settings need the b2b.settings.manage permission', 403);
                }
                $this->permissions->authorize($actorId, Permissions::SETTINGS_B2B);
                return;
            }
        }
    }

    private function ensureRestrictedRows(): void
    {
        foreach (self::RESTRICTED_DEFAULTS as $key => [$value, $type, $group]) {
            if (!$this->repo->findByKey($key)) {
                $this->repo->create(['key' => $key, 'value' => $value, 'type' => $type, 'group_name' => $group]);
            }
        }
    }

    /** Typed read for services (checkout, B2B). Falls back to the built-in default. */
    public function get(string $key, mixed $fallback = null): mixed
    {
        $row = $this->repo->findByKey($key);
        if (!$row) {
            if (!isset(self::RESTRICTED_DEFAULTS[$key])) {
                return $fallback;
            }
            [$value, $type] = self::RESTRICTED_DEFAULTS[$key];
            $row = ['value' => $value, 'type' => $type];
        }
        $value = (string)($row['value'] ?? '');
        return match ($row['type']) {
            'boolean' => in_array(strtolower($value), ['1', 'true', 'yes', 'on'], true),
            'number' => is_numeric($value) ? $value + 0 : $fallback,
            'json' => json_decode($value, true) ?? $fallback,
            default => $value,
        };
    }

    // Creates the announcement rows on first use so they show up in the admin
    // Settings page without a manual seeder run.
    private function ensureAnnouncementRows(): void
    {
        foreach (self::ANNOUNCEMENT_DEFAULTS as $key => $value) {
            $existing = $this->repo->findByKey($key);
            if (!$existing) {
                $this->repo->create([
                    'key' => $key,
                    'value' => $value,
                    'type' => 'string',
                    'group_name' => (str_starts_with($key, 'contact_') || $key === 'whatsapp_number') ? 'contact' : 'general',
                ]);
            } elseif ($key === 'whatsapp_number' && ($existing['group_name'] ?? '') !== 'contact') {
                DatabaseManager::query("UPDATE settings SET group_name = 'contact' WHERE `key` = 'whatsapp_number'");
            }
        }
    }

    public function publicAnnouncement(): array
    {
        $this->ensureAnnouncementRows();
        $out = [];
        foreach (self::ANNOUNCEMENT_DEFAULTS as $key => $default) {
            $row = $this->repo->findByKey($key);
            $value = trim((string)($row['value'] ?? ''));
            $out[$key] = $value !== '' ? $value : $default;
        }
        return $out;
    }

    public function list(): array
    {
        $this->ensureAnnouncementRows();
        $this->ensureRestrictedRows();
        return $this->repo->allGrouped();
    }

    public function find(string $key): array
    {
        $setting = $this->repo->findByKey($key);
        if (!$setting) {
            throw new DomainException('Setting not found', 404);
        }
        return $setting;
    }

    public function create(array $input, ?int $actorId = null): array
    {
        $key = trim((string)($input['key'] ?? ''));
        if (!preg_match('/^[a-z][a-z0-9_]*$/', $key)) {
            throw new DomainException('Key must be lowercase snake_case (e.g. site_name)', 422);
        }
        $this->authorizeKeys([$key], $actorId);
        if ($this->repo->findByKey($key)) {
            throw new DomainException('A setting with this key already exists', 409);
        }

        $type = (string)($input['type'] ?? 'string');
        if (!in_array($type, self::VALID_TYPES, true)) {
            throw new DomainException('Invalid setting type', 422);
        }

        $value = $this->normalizeValue($type, $input['value'] ?? '');

        $this->repo->create([
            'key' => $key,
            'value' => $value,
            'type' => $type,
            'group_name' => $input['group_name'] !== null && $input['group_name'] !== ''
                ? (string)($input['group_name'] ?? '')
                : null,
        ]);

        return $this->find($key);
    }

    public function update(string $key, array $input, ?int $actorId = null): array
    {
        $this->authorizeKeys([$key], $actorId);
        $setting = $this->repo->findByKey($key);
        if (!$setting) {
            throw new DomainException('Setting not found', 404);
        }

        if (array_key_exists('value', $input)) {
            $value = $this->normalizeValue($setting['type'], $input['value']);
            $this->repo->updateByKey($key, $value);
        }

        $fields = [];
        if (array_key_exists('type', $input)) {
            if (!in_array($input['type'], self::VALID_TYPES, true)) {
                throw new DomainException('Invalid setting type', 422);
            }
            $fields['type'] = $input['type'];
        }
        if (array_key_exists('group_name', $input)) {
            $fields['group_name'] = $input['group_name'] !== null && $input['group_name'] !== ''
                ? (string)$input['group_name']
                : null;
        }
        if (!empty($fields)) {
            $id = (int)$setting['id'];
            $this->repo->update($id, $fields);
        }

        return $this->find($key);
    }

    /**
     * Update many settings in one transaction — matches how an admin settings page
     * with several fields typically submits on save (one request, not one per field).
     */
    public function bulkUpdate(array $items, ?int $actorId = null): array
    {
        $changed = [];
        foreach ($items as $key => $value) {
            $setting = $this->repo->findByKey((string)$key);
            if (!$setting) {
                throw new DomainException("Unknown setting key: {$key}", 422);
            }
            // validate before writing anything
            if ($this->normalizeValue($setting['type'], $value) !== (string)($setting['value'] ?? '')) {
                $changed[] = (string)$key;
            }
        }
        // Only keys whose value actually changes need the permission, so an admin can
        // still save a settings tab that merely displays a restricted value.
        $this->authorizeKeys($changed, $actorId);

        DatabaseManager::beginTransaction();
        try {
            foreach ($items as $key => $value) {
                $setting = $this->repo->findByKey((string)$key);
                $this->repo->updateByKey((string)$key, $this->normalizeValue($setting['type'], $value));
            }
            DatabaseManager::commit();
        } catch (\Throwable $e) {
            DatabaseManager::rollBack();
            throw $e;
        }

        return $this->list();
    }

    public function delete(string $key, ?int $actorId = null): void
    {
        if (in_array($key, self::PROTECTED_KEYS, true) || isset(self::RESTRICTED_DEFAULTS[$key])) {
            throw new DomainException('This is a core setting and cannot be deleted', 409);
        }
        if (!$this->repo->findByKey($key)) {
            throw new DomainException('Setting not found', 404);
        }
        $this->repo->deleteByKey($key);
    }

    private function normalizeValue(string $type, mixed $value): string
    {
        switch ($type) {
            case 'number':
                if (!is_numeric($value)) {
                    throw new DomainException('Value must be numeric for this setting', 422);
                }
                return (string)$value;
            case 'boolean':
                $normalized = strtolower(trim((string)$value));
                if (!in_array($normalized, ['1', '0', 'true', 'false'], true)) {
                    throw new DomainException('Value must be a boolean (true/false) for this setting', 422);
                }
                return in_array($normalized, ['1', 'true'], true) ? '1' : '0';
            case 'json':
                $decoded = json_decode((string)$value);
                if ($decoded === null && json_last_error() !== JSON_ERROR_NONE) {
                    throw new DomainException('Value must be valid JSON for this setting', 422);
                }
                return (string)$value;
            default:
                return (string)$value;
        }
    }
}
