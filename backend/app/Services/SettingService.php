<?php

declare(strict_types=1);

namespace App\Services;

use App\Core\Database\DatabaseManager;
use App\Exceptions\DomainException;
use App\Repositories\SettingRepository;

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

    private SettingRepository $repo;

    public function __construct()
    {
        $this->repo = new SettingRepository();
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

    public function create(array $input): array
    {
        $key = trim((string)($input['key'] ?? ''));
        if (!preg_match('/^[a-z][a-z0-9_]*$/', $key)) {
            throw new DomainException('Key must be lowercase snake_case (e.g. site_name)', 422);
        }
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

    public function update(string $key, array $input): array
    {
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
    public function bulkUpdate(array $items): array
    {
        foreach ($items as $key => $value) {
            $setting = $this->repo->findByKey((string)$key);
            if (!$setting) {
                throw new DomainException("Unknown setting key: {$key}", 422);
            }
            $this->normalizeValue($setting['type'], $value); // validate before writing anything
        }

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

    public function delete(string $key): void
    {
        if (in_array($key, self::PROTECTED_KEYS, true)) {
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
