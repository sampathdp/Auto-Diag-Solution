<?php

declare(strict_types=1);

require_once __DIR__ . '/../../bootstrap/manual_autoload.php';

use App\Core\Database\DatabaseManager;

echo "Seeding products...\n";

// category_id/brand_id are resolved by slug at runtime (not hardcoded) so this seeder
// stays valid if ids ever shift. fitment: array of [make, model] pairs — each pair
// collapses every model year on file into one year_from/year_to product_fitments row.
// fits_all_vehicles products (oils, brake fluid) carry no fitment rows by design.
$products = [
    [
        'category' => 'engine-parts', 'brand' => 'ngk', 'sku' => 'APU-ENG-0001',
        'name_en' => 'Spark Plug Set (4pcs)', 'name_ar' => 'طقم شمعات إشعال (4 قطع)',
        'short_en' => 'Iridium spark plugs, set of 4.',
        'price' => 85.00, 'compare_at_price' => 110.00, 'cost_price' => 45.00,
        'stock' => 150, 'low_stock' => 20, 'stock_status' => 'in_stock',
        'source' => 'local', 'status' => 'active', 'fits_all' => false,
        'fitment' => [['Toyota', 'Camry'], ['Toyota', 'Corolla'], ['Honda', 'Accord']],
        'specs' => [['Electrode Material', 'مادة القطب', 'Iridium', 'إيريديوم'], ['Thread Size', 'حجم الخيط', 'M14 x 1.25', 'M14 x 1.25']],
    ],
    [
        'category' => 'engine-parts', 'brand' => 'gates', 'sku' => 'APU-ENG-0002',
        'name_en' => 'Timing Belt Kit', 'name_ar' => 'طقم سير التوقيت',
        'short_en' => 'Complete timing belt kit with tensioner.',
        'price' => 320.00, 'compare_at_price' => null, 'cost_price' => 180.00,
        'stock' => 40, 'low_stock' => 5, 'stock_status' => 'in_stock',
        'source' => 'local', 'status' => 'active', 'fits_all' => false,
        'fitment' => [['Toyota', 'Land Cruiser'], ['Toyota', 'Prado']],
        'specs' => [],
    ],
    [
        'category' => 'engine-parts', 'brand' => 'febi-bilstein', 'sku' => 'APU-ENG-0003',
        'name_en' => 'Piston Ring Set', 'name_ar' => 'طقم حلقات المكبس',
        'short_en' => 'Standard-size piston ring set.',
        'price' => 210.00, 'compare_at_price' => null, 'cost_price' => 120.00,
        'stock' => 0, 'low_stock' => 5, 'stock_status' => 'out_of_stock',
        'source' => 'local', 'status' => 'active', 'fits_all' => false,
        'fitment' => [['Nissan', 'Altima']],
        'specs' => [],
    ],
    [
        'category' => 'filters', 'brand' => 'mann-filter', 'sku' => 'APU-FLT-0001',
        'name_en' => 'Oil Filter', 'name_ar' => 'فلتر الزيت',
        'short_en' => 'Spin-on oil filter.',
        'price' => 28.00, 'compare_at_price' => null, 'cost_price' => 12.00,
        'stock' => 300, 'low_stock' => 30, 'stock_status' => 'in_stock',
        'source' => 'local', 'status' => 'active', 'fits_all' => false,
        'fitment' => [['Toyota', 'Camry'], ['Toyota', 'Corolla'], ['Toyota', 'Yaris']],
        'specs' => [],
    ],
    [
        'category' => 'filters', 'brand' => 'mann-filter', 'sku' => 'APU-FLT-0002',
        'name_en' => 'Engine Air Filter', 'name_ar' => 'فلتر هواء المحرك',
        'short_en' => 'Panel air filter, direct fit.',
        'price' => 45.00, 'compare_at_price' => 55.00, 'cost_price' => 22.00,
        'stock' => 180, 'low_stock' => 20, 'stock_status' => 'in_stock',
        'source' => 'local', 'status' => 'active', 'fits_all' => false,
        'fitment' => [['Honda', 'Civic'], ['Honda', 'CR-V']],
        'specs' => [],
    ],
    [
        'category' => 'filters', 'brand' => 'bosch', 'sku' => 'APU-FLT-0003',
        'name_en' => 'Cabin Pollen Filter', 'name_ar' => 'فلتر هواء المقصورة',
        'short_en' => 'Activated-carbon cabin filter.',
        'price' => 38.00, 'compare_at_price' => null, 'cost_price' => 16.00,
        'stock' => 90, 'low_stock' => 15, 'stock_status' => 'in_stock',
        'source' => '3pl', 'source_supplier' => 'SUP-BOSCH-4471', 'status' => 'active', 'fits_all' => false,
        'fitment' => [['Hyundai', 'Tucson'], ['Kia', 'Sportage']],
        'specs' => [],
    ],
    [
        'category' => 'belts-chains', 'brand' => 'gates', 'sku' => 'APU-BLT-0001',
        'name_en' => 'Serpentine Accessory Belt', 'name_ar' => 'سير الملحقات المتعدد الأخاديد',
        'short_en' => 'Multi-rib accessory drive belt.',
        'price' => 65.00, 'compare_at_price' => null, 'cost_price' => 30.00,
        'stock' => 75, 'low_stock' => 10, 'stock_status' => 'in_stock',
        'source' => 'local', 'status' => 'active', 'fits_all' => false,
        'fitment' => [['Mazda', '6'], ['Mazda', 'CX-5']],
        'specs' => [],
    ],
    [
        'category' => 'gaskets-seals', 'brand' => 'febi-bilstein', 'sku' => 'APU-GSK-0001',
        'name_en' => 'Cylinder Head Gasket Set', 'name_ar' => 'طقم حشية رأس الأسطوانة',
        'short_en' => 'Full head gasket set with bolts.',
        'price' => 260.00, 'compare_at_price' => null, 'cost_price' => 150.00,
        'stock' => 25, 'low_stock' => 5, 'stock_status' => 'in_stock',
        'source' => 'local', 'status' => 'draft', 'fits_all' => false,
        'fitment' => [['Mitsubishi', 'Lancer']],
        'specs' => [],
    ],
    [
        'category' => 'brakes', 'brand' => 'bosch', 'sku' => 'APU-BRK-0001',
        'name_en' => 'Brake Fluid DOT 4 (1L)', 'name_ar' => 'زيت فرامل DOT 4 (1 لتر)',
        'short_en' => 'Universal DOT 4 brake fluid.',
        'price' => 22.00, 'compare_at_price' => null, 'cost_price' => 9.00,
        'stock' => 400, 'low_stock' => 50, 'stock_status' => 'in_stock',
        'source' => 'local', 'status' => 'active', 'fits_all' => true,
        'fitment' => [],
        'specs' => [['Volume', 'الحجم', '1 Liter', '1 لتر']],
    ],
    [
        'category' => 'brake-pads', 'brand' => 'trw', 'sku' => 'APU-BPD-0001',
        'name_en' => 'Front Brake Pad Set', 'name_ar' => 'طقم تيل فرامل أمامي',
        'short_en' => 'Ceramic front brake pads.',
        'price' => 140.00, 'compare_at_price' => 165.00, 'cost_price' => 75.00,
        'stock' => 60, 'low_stock' => 10, 'stock_status' => 'in_stock',
        'source' => 'local', 'status' => 'active', 'fits_all' => false,
        'fitment' => [['Nissan', 'Patrol'], ['Nissan', 'X-Trail']],
        'specs' => [],
    ],
    [
        'category' => 'brake-pads', 'brand' => 'trw', 'sku' => 'APU-BPD-0002',
        'name_en' => 'Rear Brake Pad Set', 'name_ar' => 'طقم تيل فرامل خلفي',
        'short_en' => 'Semi-metallic rear brake pads.',
        'price' => 120.00, 'compare_at_price' => null, 'cost_price' => 62.00,
        'stock' => 0, 'low_stock' => 10, 'stock_status' => 'out_of_stock',
        'source' => 'local', 'status' => 'active', 'fits_all' => false,
        'fitment' => [['Nissan', 'Patrol'], ['Nissan', 'X-Trail']],
        'specs' => [],
    ],
    [
        'category' => 'brake-discs-rotors', 'brand' => 'sachs', 'sku' => 'APU-BDR-0001',
        'name_en' => 'Front Brake Disc (Pair)', 'name_ar' => 'قرص فرامل أمامي (زوج)',
        'short_en' => 'Ventilated front brake discs, pair.',
        'price' => 320.00, 'compare_at_price' => null, 'cost_price' => 190.00,
        'stock' => 35, 'low_stock' => 5, 'stock_status' => 'in_stock',
        'source' => '3pl', 'source_supplier' => 'SUP-SACHS-1120', 'status' => 'active', 'fits_all' => false,
        'fitment' => [['BMW', '3 Series'], ['BMW', '5 Series']],
        'specs' => [],
    ],
    [
        'category' => 'brake-calipers', 'brand' => 'trw', 'sku' => 'APU-BCL-0001',
        'name_en' => 'Rear Brake Caliper', 'name_ar' => 'كاليبر فرامل خلفي',
        'short_en' => 'Remanufactured rear caliper, single.',
        'price' => 380.00, 'compare_at_price' => null, 'cost_price' => 230.00,
        'stock' => 8, 'low_stock' => 3, 'stock_status' => 'backorder',
        'source' => 'local', 'status' => 'active', 'fits_all' => false,
        'fitment' => [['Mercedes-Benz', 'C-Class'], ['Mercedes-Benz', 'E-Class']],
        'specs' => [],
    ],
    [
        'category' => 'suspension-steering', 'brand' => 'febi-bilstein', 'sku' => 'APU-SUS-0001',
        'name_en' => 'Tie Rod End', 'name_ar' => 'طرف ذراع التوجيه',
        'short_en' => 'Outer tie rod end, left or right.',
        'price' => 55.00, 'compare_at_price' => null, 'cost_price' => 25.00,
        'stock' => 110, 'low_stock' => 15, 'stock_status' => 'in_stock',
        'source' => 'local', 'status' => 'active', 'fits_all' => false,
        'fitment' => [['Hyundai', 'Elantra'], ['Hyundai', 'Accent']],
        'specs' => [],
    ],
    [
        'category' => 'shock-absorbers', 'brand' => 'sachs', 'sku' => 'APU-SHK-0001',
        'name_en' => 'Front Shock Absorber', 'name_ar' => 'ممتص صدمات أمامي',
        'short_en' => 'Gas-charged front shock absorber, single.',
        'price' => 175.00, 'compare_at_price' => 195.00, 'cost_price' => 95.00,
        'stock' => 50, 'low_stock' => 10, 'stock_status' => 'in_stock',
        'source' => 'local', 'status' => 'active', 'fits_all' => false,
        'fitment' => [['Kia', 'Sorento'], ['Kia', 'Sportage']],
        'specs' => [],
    ],
    [
        'category' => 'control-arms', 'brand' => 'febi-bilstein', 'sku' => 'APU-CTA-0001',
        'name_en' => 'Front Lower Control Arm', 'name_ar' => 'ذراع تحكم سفلي أمامي',
        'short_en' => 'Control arm with ball joint, left side.',
        'price' => 165.00, 'compare_at_price' => null, 'cost_price' => 88.00,
        'stock' => 30, 'low_stock' => 5, 'stock_status' => 'in_stock',
        'source' => 'local', 'status' => 'inactive', 'fits_all' => false,
        'fitment' => [['Ford', 'Explorer']],
        'specs' => [],
    ],
    [
        'category' => 'alternators-starters', 'brand' => 'denso', 'sku' => 'APU-ALT-0001',
        'name_en' => 'Ignition Coil', 'name_ar' => 'كويل الإشعال',
        'short_en' => 'Direct-fit ignition coil, single.',
        'price' => 95.00, 'compare_at_price' => null, 'cost_price' => 48.00,
        'stock' => 70, 'low_stock' => 10, 'stock_status' => 'in_stock',
        'source' => 'local', 'status' => 'active', 'fits_all' => false,
        'fitment' => [['Toyota', 'Hilux'], ['Toyota', 'Land Cruiser']],
        'specs' => [],
    ],
    [
        'category' => 'alternators-starters', 'brand' => 'denso', 'sku' => 'APU-ALT-0002',
        'name_en' => 'Alternator 120A', 'name_ar' => 'دينامو 120 أمبير',
        'short_en' => 'Remanufactured 120A alternator.',
        'price' => 650.00, 'compare_at_price' => 720.00, 'cost_price' => 410.00,
        'stock' => 12, 'low_stock' => 3, 'stock_status' => 'in_stock',
        'source' => '3pl', 'source_supplier' => 'SUP-DENSO-7782', 'status' => 'draft', 'fits_all' => false,
        'fitment' => [['Lexus', 'ES350'], ['Lexus', 'RX350']],
        'specs' => [['Amperage', 'الأمبير', '120A', '120 أمبير']],
    ],
    [
        'category' => 'alternators-starters', 'brand' => 'valeo', 'sku' => 'APU-STR-0001',
        'name_en' => 'Starter Motor', 'name_ar' => 'مارش (بادئ التشغيل)',
        'short_en' => 'Remanufactured starter motor.',
        'price' => 480.00, 'compare_at_price' => null, 'cost_price' => 290.00,
        'stock' => 18, 'low_stock' => 5, 'stock_status' => 'in_stock',
        'source' => 'local', 'status' => 'active', 'fits_all' => false,
        'fitment' => [['Chevrolet', 'Tahoe'], ['Chevrolet', 'Suburban']],
        'specs' => [],
    ],
    [
        'category' => 'batteries', 'brand' => 'acdelco', 'sku' => 'APU-BAT-0001',
        'name_en' => 'AGM Battery 70Ah', 'name_ar' => 'بطارية AGM سعة 70 أمبير',
        'short_en' => 'Maintenance-free AGM battery, 70Ah.',
        'price' => 480.00, 'compare_at_price' => null, 'cost_price' => 310.00,
        'stock' => 40, 'low_stock' => 8, 'stock_status' => 'in_stock',
        'source' => 'local', 'status' => 'active', 'fits_all' => true,
        'fitment' => [],
        'specs' => [['Capacity', 'السعة', '70Ah', '70 أمبير/ساعة'], ['Voltage', 'الجهد', '12V', '12 فولت']],
    ],
    [
        'category' => 'batteries', 'brand' => 'bosch', 'sku' => 'APU-BAT-0002',
        'name_en' => 'Maintenance-Free Battery 100Ah', 'name_ar' => 'بطارية بدون صيانة سعة 100 أمبير',
        'short_en' => 'Heavy-duty 100Ah battery.',
        'price' => 620.00, 'compare_at_price' => 680.00, 'cost_price' => 400.00,
        'stock' => 22, 'low_stock' => 5, 'stock_status' => 'in_stock',
        'source' => '3pl', 'source_supplier' => 'SUP-BOSCH-5590', 'status' => 'active', 'fits_all' => true,
        'fitment' => [],
        'specs' => [['Capacity', 'السعة', '100Ah', '100 أمبير/ساعة']],
    ],
    [
        'category' => 'body-parts', 'brand' => 'valeo', 'sku' => 'APU-BDY-0001',
        'name_en' => 'Door Mirror Assembly', 'name_ar' => 'مجموعة مرآة الباب',
        'short_en' => 'Power-fold door mirror, right side.',
        'price' => 210.00, 'compare_at_price' => null, 'cost_price' => 120.00,
        'stock' => 15, 'low_stock' => 5, 'stock_status' => 'in_stock',
        'source' => 'local', 'status' => 'active', 'fits_all' => false,
        'fitment' => [['Nissan', 'Sunny']],
        'specs' => [],
    ],
    [
        'category' => 'bumpers', 'brand' => null, 'sku' => 'APU-BMP-0001',
        'name_en' => 'Front Bumper Cover', 'name_ar' => 'غطاء المصد الأمامي',
        'short_en' => 'Primed, unpainted front bumper cover.',
        'price' => 340.00, 'compare_at_price' => null, 'cost_price' => 190.00,
        'stock' => 6, 'low_stock' => 3, 'stock_status' => 'in_stock',
        'source' => '3pl', 'source_supplier' => 'SUP-GEN-2210', 'status' => 'active', 'fits_all' => false,
        'fitment' => [['Ford', 'F-150']],
        'specs' => [],
    ],
    [
        'category' => 'mirrors', 'brand' => 'valeo', 'sku' => 'APU-MIR-0001',
        'name_en' => 'Wing Mirror Glass', 'name_ar' => 'زجاج المرآة الجانبية',
        'short_en' => 'Heated wing mirror glass, left side.',
        'price' => 48.00, 'compare_at_price' => null, 'cost_price' => 20.00,
        'stock' => 0, 'low_stock' => 5, 'stock_status' => 'out_of_stock',
        'source' => 'local', 'status' => 'inactive', 'fits_all' => false,
        'fitment' => [['Suzuki', 'Vitara']],
        'specs' => [],
    ],
    [
        'category' => 'lighting', 'brand' => 'bosch', 'sku' => 'APU-LGT-0001',
        'name_en' => 'LED Headlight Bulb Set', 'name_ar' => 'طقم مصابيح ليد أمامية',
        'short_en' => 'H7 LED headlight conversion set.',
        'price' => 130.00, 'compare_at_price' => 160.00, 'cost_price' => 60.00,
        'stock' => 85, 'low_stock' => 15, 'stock_status' => 'in_stock',
        'source' => 'local', 'status' => 'active', 'fits_all' => true,
        'fitment' => [],
        'specs' => [['Bulb Type', 'نوع المصباح', 'H7 LED', 'H7 ليد']],
    ],
    [
        'category' => 'tires-wheels', 'brand' => null, 'sku' => 'APU-TWH-0001',
        'name_en' => 'Alloy Wheel 17"', 'name_ar' => 'جنط ألمنيوم 17 بوصة',
        'short_en' => 'Single 17-inch alloy wheel, 5-lug.',
        'price' => 420.00, 'compare_at_price' => null, 'cost_price' => 260.00,
        'stock' => 20, 'low_stock' => 4, 'stock_status' => 'in_stock',
        'source' => 'local', 'status' => 'draft', 'fits_all' => false,
        'fitment' => [['Honda', 'Accord'], ['Honda', 'Civic']],
        'specs' => [['Diameter', 'القطر', '17"', '17 بوصة'], ['Bolt Pattern', 'نمط المسامير', '5x114.3', '5x114.3']],
    ],
    [
        'category' => 'oils-fluids', 'brand' => 'mobil-1', 'sku' => 'APU-OIL-0001',
        'name_en' => 'Full Synthetic Engine Oil 5W-30 (4L)', 'name_ar' => 'زيت محرك اصطناعي كامل 5W-30 (4 لتر)',
        'short_en' => 'Full synthetic 5W-30 engine oil, 4L jug.',
        'price' => 145.00, 'compare_at_price' => 160.00, 'cost_price' => 85.00,
        'stock' => 200, 'low_stock' => 30, 'stock_status' => 'in_stock',
        'source' => 'local', 'status' => 'active', 'fits_all' => true,
        'fitment' => [],
        'specs' => [['Viscosity', 'اللزوجة', '5W-30', '5W-30'], ['Volume', 'الحجم', '4 Liters', '4 لتر']],
    ],
    [
        'category' => 'oils-fluids', 'brand' => 'castrol', 'sku' => 'APU-OIL-0002',
        'name_en' => 'Full Synthetic Engine Oil 5W-40 (4L)', 'name_ar' => 'زيت محرك اصطناعي كامل 5W-40 (4 لتر)',
        'short_en' => 'Full synthetic 5W-40 engine oil, 4L jug.',
        'price' => 150.00, 'compare_at_price' => null, 'cost_price' => 88.00,
        'stock' => 175, 'low_stock' => 30, 'stock_status' => 'in_stock',
        'source' => 'local', 'status' => 'active', 'fits_all' => true,
        'fitment' => [],
        'specs' => [['Viscosity', 'اللزوجة', '5W-40', '5W-40']],
    ],
];

function slugify(string $sku): string
{
    return strtolower(str_replace(['_', ' '], '-', $sku));
}

/**
 * Inserts one product_fitments range row per [make, model] pair (collapsing every
 * model year on file into year_from/year_to). No-op if the product already has
 * fitment rows, so it's safe to call for both newly-created and pre-existing products.
 */
function backfillFitments(int $productId, array $fitmentPairs): void
{
    if (empty($fitmentPairs)) {
        return;
    }

    $already = DatabaseManager::query(
        "SELECT COUNT(*) AS c FROM product_fitments WHERE product_id = :id",
        ['id' => $productId]
    )->fetch()['c'];
    if ((int)$already > 0) {
        return;
    }

    foreach ($fitmentPairs as [$make, $model]) {
        $years = DatabaseManager::query(
            "SELECT year FROM vehicles WHERE make = :make AND model = :model",
            ['make' => $make, 'model' => $model]
        )->fetchAll(PDO::FETCH_COLUMN);

        if (empty($years)) {
            continue;
        }

        DatabaseManager::query(
            "INSERT INTO product_fitments (product_id, make, model, year_from, year_to, vin_note)
             VALUES (:product_id, :make, :model, :year_from, :year_to, NULL)",
            [
                'product_id' => $productId,
                'make' => $make,
                'model' => $model,
                'year_from' => min($years),
                'year_to' => max($years),
            ]
        );
    }
}

$categoryIds = DatabaseManager::query("SELECT slug, id FROM categories")->fetchAll(PDO::FETCH_KEY_PAIR);
$brandIds = DatabaseManager::query("SELECT slug, id FROM brands")->fetchAll(PDO::FETCH_KEY_PAIR);

$seeded = 0;
$skipped = 0;

foreach ($products as $p) {
    $existing = DatabaseManager::query(
        "SELECT id FROM products WHERE sku = :sku LIMIT 1",
        ['sku' => $p['sku']]
    )->fetch();

    if ($existing) {
        echo "Skipped (already exists): {$p['sku']} {$p['name_en']}\n";
        $skipped++;
        backfillFitments((int)$existing['id'], $p['fitment']);
        continue;
    }

    $categoryId = $categoryIds[$p['category']] ?? null;
    $brandId = $p['brand'] !== null ? ($brandIds[$p['brand']] ?? null) : null;
    $slug = slugify($p['sku']) . '-' . preg_replace('/[^a-z0-9]+/', '-', strtolower($p['name_en']));
    $slug = trim($slug, '-');

    DatabaseManager::query(
        "INSERT INTO products
            (category_id, brand_id, sku, name_en, name_ar, slug, description_en, description_ar,
             short_description_en, short_description_ar, price, vat_inclusive, compare_at_price, cost_price,
             stock_quantity, low_stock_threshold, track_inventory, stock_status, images, weight_kg,
             source, source_supplier_id, status, fits_all_vehicles)
         VALUES
            (:category_id, :brand_id, :sku, :name_en, :name_ar, :slug, :description_en, :description_ar,
             :short_description_en, :short_description_ar, :price, 1, :compare_at_price, :cost_price,
             :stock_quantity, :low_stock_threshold, 1, :stock_status, :images, NULL,
             :source, :source_supplier_id, :status, :fits_all_vehicles)",
        [
            'category_id' => $categoryId,
            'brand_id' => $brandId,
            'sku' => $p['sku'],
            'name_en' => $p['name_en'],
            'name_ar' => $p['name_ar'],
            'slug' => $slug,
            'description_en' => '<p>' . $p['short_en'] . '</p>',
            'description_ar' => '',
            'short_description_en' => $p['short_en'],
            'short_description_ar' => '',
            'price' => $p['price'],
            'compare_at_price' => $p['compare_at_price'],
            'cost_price' => $p['cost_price'],
            'stock_quantity' => $p['stock'],
            'low_stock_threshold' => $p['low_stock'],
            'stock_status' => $p['stock_status'],
            'images' => json_encode([]),
            'source' => $p['source'],
            'source_supplier_id' => $p['source_supplier'] ?? null,
            'status' => $p['status'],
            'fits_all_vehicles' => $p['fits_all'] ? 1 : 0,
        ]
    );

    $productId = (int) DatabaseManager::query("SELECT LAST_INSERT_ID() AS id")->fetch()['id'];

    backfillFitments($productId, $p['fitment']);

    foreach ($p['specs'] as $i => [$keyEn, $keyAr, $valEn, $valAr]) {
        DatabaseManager::query(
            "INSERT INTO product_specifications (product_id, key_en, key_ar, value_en, value_ar, sort_order)
             VALUES (:product_id, :key_en, :key_ar, :value_en, :value_ar, :sort_order)",
            [
                'product_id' => $productId,
                'key_en' => $keyEn,
                'key_ar' => $keyAr,
                'value_en' => $valEn,
                'value_ar' => $valAr,
                'sort_order' => $i,
            ]
        );
    }

    echo "Seeded: {$p['sku']} {$p['name_en']}\n";
    $seeded++;
}

echo "Product seeding complete. Seeded: {$seeded}, Skipped: {$skipped}.\n";
