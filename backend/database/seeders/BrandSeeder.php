<?php

declare(strict_types=1);

require_once __DIR__ . '/../../bootstrap/manual_autoload.php';

use App\Core\Database\DatabaseManager;

echo "Seeding brands...\n";

// logo: null where no genuine Wikimedia Commons logo exists for the brand (Febi Bilstein,
// Gates) — the storefront falls back to an initials avatar rather than link a wrong logo.
$brands = [
    ['name_en' => 'Bosch', 'name_ar' => 'بوش', 'slug' => 'bosch', 'description_en' => 'German engineering — filters, brakes, electrical and diagnostics parts.', 'logo' => 'https://upload.wikimedia.org/wikipedia/commons/1/16/Bosch-logo.svg'],
    ['name_en' => 'Denso', 'name_ar' => 'دنسو', 'slug' => 'denso', 'description_en' => 'Japanese OEM supplier — spark plugs, filters, alternators and A/C parts.', 'logo' => 'https://upload.wikimedia.org/wikipedia/commons/a/a7/Denso_logo.svg'],
    ['name_en' => 'ACDelco', 'name_ar' => 'إيه سي دلكو', 'slug' => 'acdelco', 'description_en' => 'GM\'s OEM parts brand — batteries, brakes and filters.', 'logo' => 'https://upload.wikimedia.org/wikipedia/commons/5/58/ACDelco_logo.svg'],
    ['name_en' => 'NGK', 'name_ar' => 'إن جي كيه', 'slug' => 'ngk', 'description_en' => 'Spark plugs, ignition coils and oxygen sensors.', 'logo' => 'https://upload.wikimedia.org/wikipedia/commons/9/9c/Ngkntk_logo.svg'],
    ['name_en' => 'Mann-Filter', 'name_ar' => 'مان فلتر', 'slug' => 'mann-filter', 'description_en' => 'German filtration specialist — oil, air, cabin and fuel filters.', 'logo' => 'https://upload.wikimedia.org/wikipedia/commons/4/42/MANN+HUMMEL_Logo.svg'],
    ['name_en' => 'Febi Bilstein', 'name_ar' => 'فيبي بيلشتاين', 'slug' => 'febi-bilstein', 'description_en' => 'Wide-range OE-matching replacement parts.', 'logo' => null],
    ['name_en' => 'Sachs', 'name_ar' => 'ساكس', 'slug' => 'sachs', 'description_en' => 'Shock absorbers, clutches and suspension components.', 'logo' => 'https://upload.wikimedia.org/wikipedia/commons/8/83/ZF_Sachs_logo.svg'],
    ['name_en' => 'TRW', 'name_ar' => 'تي آر دبليو', 'slug' => 'trw', 'description_en' => 'Braking and steering systems specialist.', 'logo' => 'https://upload.wikimedia.org/wikipedia/commons/d/db/TRW_logo.svg'],
    ['name_en' => 'Valeo', 'name_ar' => 'فاليو', 'slug' => 'valeo', 'description_en' => 'Lighting, clutches, wipers and thermal systems.', 'logo' => 'https://upload.wikimedia.org/wikipedia/commons/2/2b/Valeo_Logo.svg'],
    ['name_en' => 'Gates', 'name_ar' => 'جيتس', 'slug' => 'gates', 'description_en' => 'Belts, hoses and cooling system components.', 'logo' => null],
    ['name_en' => 'Mobil 1', 'name_ar' => 'موبيل 1', 'slug' => 'mobil-1', 'description_en' => 'Full synthetic motor oils and lubricants.', 'logo' => 'https://upload.wikimedia.org/wikipedia/commons/5/5c/Mobil1_logo.png'],
    ['name_en' => 'Castrol', 'name_ar' => 'كاسترول', 'slug' => 'castrol', 'description_en' => 'Motor oils, greases and coolants.', 'logo' => 'https://upload.wikimedia.org/wikipedia/commons/4/40/Castrol_logo_2023.svg'],
];

foreach ($brands as $brand) {
    $existing = DatabaseManager::query(
        "SELECT id, logo FROM brands WHERE slug = :slug LIMIT 1",
        ['slug' => $brand['slug']]
    )->fetch();

    if ($existing) {
        if ($existing['logo'] === null && $brand['logo'] !== null) {
            DatabaseManager::query(
                "UPDATE brands SET logo = :logo WHERE id = :id",
                ['logo' => $brand['logo'], 'id' => $existing['id']]
            );
            echo "Updated logo: {$brand['name_en']}\n";
        } else {
            echo "Skipped (already exists): {$brand['name_en']}\n";
        }
        continue;
    }

    DatabaseManager::query(
        "INSERT INTO brands (name_en, name_ar, slug, description_en, logo, is_active)
         VALUES (:name_en, :name_ar, :slug, :description_en, :logo, 1)",
        $brand
    );
    echo "Seeded: {$brand['name_en']}\n";
}

echo "Brand seeding complete.\n";
