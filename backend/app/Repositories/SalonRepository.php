<?php

declare(strict_types=1);

namespace App\Repositories;

class SalonRepository extends BaseRepository
{
    public function __construct()
    {
        parent::__construct('salons');
    }

    public function all(array $filters = [], int $page = 1, int $perPage = 100): array
    {
        $sql = "SELECT s.*, 
                       sa.theme, sa.primary_color, sa.font_family, sa.button_style, sa.logo, sa.cover_image, sa.layout_style,
                       sub.id as subscription_id, sub.plan_id, sub.starts_at, sub.expires_at, sub.status as sub_status,
                       sp.display_name as plan_display_name, sp.name as plan_name, sp.permissions as plan_permissions
                FROM salons s 
                LEFT JOIN salon_appearances sa ON s.id = sa.salon_id
                LEFT JOIN subscriptions sub ON s.id = sub.salon_id AND sub.status IN ('trial', 'active')
                LEFT JOIN subscription_plans sp ON sub.plan_id = sp.id
                ORDER BY s.created_at DESC";
        
        return \App\Core\Database\DatabaseManager::query($sql)->fetchAll();
    }

    public function find(int $id): ?array
    {
        $sql = "SELECT s.*, sa.theme, sa.primary_color, sa.font_family, sa.button_style, sa.logo, sa.cover_image, sa.layout_style,
                       sa.hero_tagline, sa.hero_title, sa.hero_subtitle,
                       sa.social_instagram, sa.social_facebook
                FROM salons s
                LEFT JOIN salon_appearances sa ON s.id = sa.salon_id
                WHERE s.id = :id LIMIT 1";
        $stmt = \App\Core\Database\DatabaseManager::query($sql, ['id' => $id]);
        $salon = $stmt->fetch();
        return $salon ?: null;
    }

    public function findBySlug(string $slug): ?array
    {
        $sql = "SELECT s.id, s.name, s.slug, s.email, s.phone, s.address, s.currency, s.timezone, s.is_active,
                       s.require_payment_upfront, s.upfront_type, s.upfront_amount,
                       sa.theme, sa.primary_color, sa.font_family, sa.button_style, sa.logo, sa.cover_image, sa.layout_style,
                       sa.hero_tagline, sa.hero_title, sa.hero_subtitle,
                       sa.social_instagram, sa.social_facebook,
                       sp.allowed_themes, sub.status as sub_status
                FROM salons s
                LEFT JOIN salon_appearances sa ON s.id = sa.salon_id
                LEFT JOIN subscriptions sub ON s.id = sub.salon_id AND sub.status IN ('trial', 'active')
                LEFT JOIN subscription_plans sp ON sub.plan_id = sp.id
                WHERE s.slug = :slug LIMIT 1";
        $stmt = \App\Core\Database\DatabaseManager::query($sql, ['slug' => $slug]);
        $salon = $stmt->fetch();
        if ($salon) {
            $allowed = isset($salon['allowed_themes']) ? json_decode($salon['allowed_themes'], true) : ['modern'];
            if (!in_array($salon['theme'], $allowed)) {
                $salon['theme'] = $allowed[0] ?? 'modern';
            }
        }
        return $salon ?: null;
    }


    /**
     * If a logo/cover_image value is a base64 data URI, save it to disk and
     * return the public-relative path.  This keeps the DB row small and
     * prevents emails (and API responses) from carrying megabytes of base64.
     */
    private function persistDataUri(string $dataUri, string $prefix, int $salonId): string
    {
        // data:[<mediatype>][;base64],<data>
        if (!preg_match('/^data:(image\/[a-z+]+);base64,(.+)$/i', $dataUri, $m)) {
            return $dataUri; // not a recognised data URI — leave as-is
        }

        $mimeType  = strtolower($m[1]); // e.g. image/png
        $b64Data   = $m[2];
        $ext       = match ($mimeType) {
            'image/jpeg' => 'jpg',
            'image/gif'  => 'gif',
            'image/webp' => 'webp',
            'image/svg+xml' => 'svg',
            default      => 'png',
        };

        $uploadDir = rtrim($_SERVER['DOCUMENT_ROOT'] ?? '', '/') . '/uploads/' . $prefix;
        if (!is_dir($uploadDir)) {
            mkdir($uploadDir, 0755, true);
        }

        $filename = $prefix . '_' . $salonId . '_' . substr(md5($b64Data), 0, 8) . '.' . $ext;
        $filePath = $uploadDir . '/' . $filename;

        file_put_contents($filePath, base64_decode($b64Data));

        return '/uploads/' . $prefix . '/' . $filename;
    }

    public function update(int $id, array $data): bool
    {
        $appearanceFields = ['theme', 'primary_color', 'font_family', 'button_style', 'logo', 'cover_image', 'layout_style', 'hero_tagline', 'hero_title', 'hero_subtitle', 'social_instagram', 'social_facebook'];
        $salonData = [];
        $appearanceData = [];

        foreach ($data as $key => $val) {
            if (in_array($key, $appearanceFields)) {
                // Convert data URIs to real files before storing
                if (in_array($key, ['logo', 'cover_image']) && is_string($val) && str_starts_with($val, 'data:')) {
                    $val = $this->persistDataUri($val, $key === 'logo' ? 'logos' : 'covers', $id);
                }
                $appearanceData[$key] = $val;
            } else {
                $salonData[$key] = $val;
            }
        }
        
        $success = true;
        
        if (!empty($salonData)) {
            $success = parent::update($id, $salonData);
        }
        
        if (!empty($appearanceData)) {
            // Ensure appearance record exists (upsert)
            $checkSql = "SELECT 1 FROM salon_appearances WHERE salon_id = :salon_id LIMIT 1";
            $exists = \App\Core\Database\DatabaseManager::query($checkSql, ['salon_id' => $id])->fetch();
            if (!$exists) {
                $insColumns = implode(', ', array_merge(['salon_id'], array_keys($appearanceData)));
                $insPlaceholders = ':' . implode(', :', array_merge(['salon_id'], array_keys($appearanceData)));
                $insSql = "INSERT INTO salon_appearances ($insColumns) VALUES ($insPlaceholders)";
                \App\Core\Database\DatabaseManager::query($insSql, array_merge($appearanceData, ['salon_id' => $id]));
            } else {
                $fields = [];
                foreach (array_keys($appearanceData) as $key) {
                    $fields[] = "{$key} = :{$key}";
                }
                $fieldsStr = implode(', ', $fields);
                $updSql = "UPDATE salon_appearances SET {$fieldsStr} WHERE salon_id = :salon_id";
                \App\Core\Database\DatabaseManager::query($updSql, array_merge($appearanceData, ['salon_id' => $id]));
            }
        }
        
        return $success;
    }
}
