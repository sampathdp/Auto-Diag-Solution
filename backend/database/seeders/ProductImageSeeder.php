<?php

declare(strict_types=1);

require_once __DIR__ . '/../../bootstrap/manual_autoload.php';

use App\Core\Database\DatabaseManager;

echo "Seeding placeholder product images...\n";

// No real product photography exists yet — these are simple local SVG icons (not
// external stock photos, so nothing depends on a guessed third-party URL staying
// valid) grouped by category so the storefront/admin don't show a bare placeholder
// icon for every single seeded test product. Swap for real photos via the admin
// media library whenever they're available; this backfill never overwrites a
// product that already has images set.
$icons = ['battery', 'brake-disc', 'engine', 'filter', 'suspension', 'lighting', 'tire', 'oil', 'body'];

$categoryToIcon = [
    'engine-parts' => 'engine',
    'gaskets-seals' => 'engine',
    'belts-chains' => 'engine',
    'filters' => 'filter',
    'brakes' => 'brake-disc',
    'brake-pads' => 'brake-disc',
    'brake-discs-rotors' => 'brake-disc',
    'brake-calipers' => 'brake-disc',
    'suspension-steering' => 'suspension',
    'shock-absorbers' => 'suspension',
    'control-arms' => 'suspension',
    'electrical-batteries' => 'battery',
    'batteries' => 'battery',
    'alternators-starters' => 'battery',
    'body-parts' => 'body',
    'bumpers' => 'body',
    'mirrors' => 'body',
    'lighting' => 'lighting',
    'tires-wheels' => 'tire',
    'oils-fluids' => 'oil',
];

$mediaIdByIcon = [];
foreach ($icons as $icon) {
    // Under public/uploads/parts/ (not a separate scheme) so these are served through
    // StorageController like any real upload — see ProductService::shapePublic().
    $path = "/uploads/parts/{$icon}.svg";
    $existing = DatabaseManager::query("SELECT id FROM media WHERE path = :path LIMIT 1", ['path' => $path])->fetch();
    if ($existing) {
        $mediaIdByIcon[$icon] = (int)$existing['id'];
        continue;
    }
    $absolutePath = dirname(__DIR__, 2) . '/public' . $path;
    $sizeBytes = file_exists($absolutePath) ? filesize($absolutePath) : 0;
    DatabaseManager::query(
        "INSERT INTO media (path, original_filename, mime_type, size_bytes, alt_text_en, alt_text_ar)
         VALUES (:path, :original_filename, 'image/svg+xml', :size_bytes, :alt_en, :alt_ar)",
        [
            'path' => $path,
            'original_filename' => "{$icon}.svg",
            'size_bytes' => $sizeBytes,
            'alt_en' => ucfirst(str_replace('-', ' ', $icon)) . ' placeholder',
            'alt_ar' => null,
        ]
    );
    $mediaIdByIcon[$icon] = (int)DatabaseManager::query("SELECT LAST_INSERT_ID() AS id")->fetch()['id'];
    echo "Created media row for {$icon} ({$mediaIdByIcon[$icon]})\n";
}

$products = DatabaseManager::query(
    "SELECT p.id, p.images, c.slug AS category_slug
     FROM products p
     LEFT JOIN categories c ON c.id = p.category_id"
)->fetchAll();

$updated = 0;
foreach ($products as $p) {
    $currentImages = json_decode((string)($p['images'] ?? '[]'), true) ?? [];
    if (!empty($currentImages)) {
        continue; // already has real images — never overwrite
    }
    $icon = $categoryToIcon[$p['category_slug']] ?? null;
    if ($icon === null) {
        continue;
    }
    DatabaseManager::query(
        "UPDATE products SET images = :images WHERE id = :id",
        ['images' => json_encode([$mediaIdByIcon[$icon]]), 'id' => $p['id']]
    );
    $updated++;
}

echo "Product image backfill complete. Updated: {$updated}.\n";
