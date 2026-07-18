<?php

declare(strict_types=1);

require_once __DIR__ . '/../../bootstrap/manual_autoload.php';

use App\Core\Database\DatabaseManager;

echo "Seeding About Us page...\n";

// Seeded from the storefront's current hardcoded copy (messages/en.json + ar.json,
// "about" namespace) so the admin form starts pre-filled with exactly what's live
// today, instead of admins having to re-author it from scratch.
$values = [
    [
        'icon' => 'ShieldCheck',
        'title_en' => 'Verified Sourcing',
        'title_ar' => 'مصادر موثّقة',
        'body_en' => 'Every part is traced to a certified manufacturer or authorized channel before it\'s allowed into our catalogue — no grey-market substitutes.',
        'body_ar' => 'كل قطعة يتم تتبعها إلى مصنّع معتمد أو قناة توزيع رسمية قبل إدراجها في كتالوجنا — دون بدائل من السوق الرمادية.',
    ],
    [
        'icon' => 'Target',
        'title_en' => 'Fitment First',
        'title_ar' => 'التوافق أولاً',
        'body_en' => 'Our team confirms compatibility against your VIN or vehicle details before you order, so the part that arrives is the part that fits.',
        'body_ar' => 'يتحقق فريقنا من التوافق بناءً على رقم الهيكل أو تفاصيل مركبتك قبل الطلب، لتصلك القطعة المناسبة فعلاً.',
    ],
    [
        'icon' => 'PackageCheck',
        'title_en' => 'Stocked, Not Ordered-In',
        'title_ar' => 'مخزّنة، لا مطلوبة عند الطلب',
        'body_en' => 'We hold inventory locally in Dubai rather than drop-shipping from overseas — that\'s what makes same-day dispatch possible.',
        'body_ar' => 'نحتفظ بالمخزون محلياً في دبي بدلاً من الشحن من الخارج عند كل طلب — وهذا ما يجعل التوصيل في نفس اليوم ممكناً.',
    ],
    [
        'icon' => 'MessageCircle',
        'title_en' => 'Straightforward Support',
        'title_ar' => 'دعم مباشر وبسيط',
        'body_en' => 'One WhatsApp thread from question to delivery — no ticket numbers, no call centres, no chasing.',
        'body_ar' => 'محادثة واحدة عبر واتساب من السؤال حتى التوصيل — دون أرقام تذاكر أو مراكز اتصال أو متابعة مرهقة.',
    ],
];

$milestones = [
    [
        'year_en' => '2015', 'year_ar' => '2015',
        'title_en' => 'ASIL Founded', 'title_ar' => 'تأسيس أصيل',
        'body_en' => 'Opened our first parts counter in Al Quoz with a catalogue of under 500 SKUs.',
        'body_ar' => 'افتتحنا أول منفذ لقطع الغيار في القوز بكتالوج أقل من 500 قطعة.',
    ],
    [
        'year_en' => '2018', 'year_ar' => '2018',
        'title_en' => 'Distribution Centre', 'title_ar' => 'مركز التوزيع',
        'body_en' => 'Moved into our current Al Quoz Industrial Area warehouse to hold serious inventory locally.',
        'body_ar' => 'انتقلنا إلى مستودعنا الحالي في منطقة القوز الصناعية لتخزين مخزون فعلي محلياً.',
    ],
    [
        'year_en' => '2021', 'year_ar' => '2021',
        'title_en' => '10,000+ SKUs', 'title_ar' => 'أكثر من 10,000 قطعة',
        'body_en' => 'Crossed 10,000 stocked parts across engine, brakes, filtration and electrical systems.',
        'body_ar' => 'تجاوزنا 10,000 قطعة مخزّنة عبر أنظمة المحرك والمكابح والفلترة والكهرباء.',
    ],
    [
        'year_en' => '2026', 'year_ar' => '2026',
        'title_en' => 'UAE-Wide Delivery', 'title_ar' => 'توصيل لكل الإمارات',
        'body_en' => 'Same-day dispatch in Dubai, next-day across every other Emirate.',
        'body_ar' => 'توصيل في نفس اليوم داخل دبي، وفي اليوم التالي لبقية الإمارات.',
    ],
];

$row = [
    'hero_eyebrow_en' => 'About ASIL',
    'hero_eyebrow_ar' => 'عن أصيل',
    'hero_title_en' => 'Built for the UAE Driver.',
    'hero_title_ar' => 'صُنعت لسائق الإمارات.',
    'hero_subtitle_en' => 'Genuine and OEM auto parts, sourced globally and stocked locally in Dubai since 2015.',
    'hero_subtitle_ar' => 'قطع غيار أصلية ومعادلة للأصلية، مصدرها عالمي ومخزّنة محلياً في دبي منذ 2015.',
    'hero_crumb_en' => 'About',
    'hero_crumb_ar' => 'من نحن',
    'story_eyebrow_en' => 'Our Story',
    'story_eyebrow_ar' => 'قصتنا',
    'story_title_en' => 'We started with one frustration: waiting weeks for a part that should take a day.',
    'story_title_ar' => 'بدأنا بإحباط واحد: انتظار أسابيع لقطعة كان يجب أن تصل خلال يوم.',
    'story_body1_en' => 'ASIL was founded in Dubai in 2015 after our own team spent too many afternoons chasing down a single brake caliper that sat in a customs warehouse for three weeks. We built the company we wished existed — one that actually stocks the parts UAE drivers need, in the UAE, ready to move.',
    'story_body1_ar' => 'تأسست أصيل في دبي عام 2015 بعد أن أمضى فريقنا فترات طويلة بحثاً عن قطعة مكابح واحدة ظلت عالقة في مستودع جمركي لثلاثة أسابيع. بنينا الشركة التي تمنينا وجودها — شركة تُخزّن فعلياً القطع التي يحتاجها سائقو الإمارات، داخل الإمارات، وجاهزة للتوصيل.',
    'story_body2_en' => 'Today that means over 10,000 SKUs held locally across engine, brake, filtration and electrical systems, sourced directly from certified manufacturers and matched precisely to what\'s on the road here — from daily runabouts to full workshop rebuilds.',
    'story_body2_ar' => 'اليوم يعني ذلك أكثر من 10,000 قطعة مخزّنة محلياً عبر أنظمة المحرك والمكابح والفلترة والكهرباء، مصدرها مباشرة من مصنعين معتمدين ومطابقة بدقة لما هو موجود فعلياً على طرق الإمارات — من الصيانة اليومية إلى إعادة البناء الكاملة.',
    'story_image_tag_en' => 'ASIL · Dubai Distribution Centre',
    'story_image_tag_ar' => 'أصيل · مركز التوزيع في دبي',
    'story_image_url' => '/about-warehouse.png',
    'values_eyebrow_en' => 'How We Work',
    'values_eyebrow_ar' => 'كيف نعمل',
    'values_title_en' => 'The principles behind every order.',
    'values_title_ar' => 'المبادئ خلف كل طلبية.',
    'values_json' => json_encode($values, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES),
    'timeline_eyebrow_en' => 'Milestones',
    'timeline_eyebrow_ar' => 'محطات بارزة',
    'timeline_title_en' => 'Nine years of stocking the right part.',
    'timeline_title_ar' => 'تسع سنوات من تخزين القطعة المناسبة.',
    'milestones_json' => json_encode($milestones, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES),
];

try {
    $existing = DatabaseManager::query("SELECT id FROM about_page LIMIT 1")->fetch();

    if ($existing) {
        echo "Skipped (already seeded): about_page id={$existing['id']}\n";
    } else {
        $columns = '`' . implode('`, `', array_keys($row)) . '`';
        $placeholders = ':' . implode(', :', array_keys($row));
        DatabaseManager::query("INSERT INTO about_page ($columns) VALUES ($placeholders)", $row);
        echo "Seeded: about_page\n";
    }

    echo "About Us page seeding complete.\n";
} catch (Exception $e) {
    echo "Error seeding About Us page: " . $e->getMessage() . "\n";
}
