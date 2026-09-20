<?php

declare(strict_types=1);

require_once __DIR__ . '/../../bootstrap/manual_autoload.php';

use App\Core\Database\DatabaseManager;

echo "Seeding home page...
";

// Seeded from the storefront's current copy (messages/en.json + ar.json, "home"
// namespace) so the admin form starts pre-filled with exactly what's live today.
$content = <<<'JSON'
{
    "hero": {
        "eyebrow_en": "UAE Auto Parts Distributor · Est. 2015",
        "eyebrow_ar": "موزع قطع غيار السيارات في الإمارات · تأسست 2015",
        "title_line1_en": "Precision Auto Parts.",
        "title_line1_ar": "قطع غيار دقيقة.",
        "title_line2_en": "Delivered Across",
        "title_line2_ar": "توصيل لجميع أنحاء",
        "title_highlight_en": "the UAE.",
        "title_highlight_ar": "الإمارات.",
        "subtitle_en": "Genuine and OEM parts for 500+ vehicle models, sourced globally and stocked in Dubai — so the right part reaches your garage, not just your inbox.",
        "subtitle_ar": "قطع غيار أصلية ومعادلة للأصلية لأكثر من 500 طراز مركبة، مصدرها عالمي ومخزنة في دبي — لتصل القطعة الصحيحة إلى ورشتك، لا إلى بريدك الإلكتروني فقط.",
        "credential1_en": "10,000+ SKUs In Stock",
        "credential1_ar": "أكثر من 10,000 قطعة متوفرة",
        "credential2_en": "OEM & Genuine Parts",
        "credential2_ar": "قطع أصلية ومعادلة للأصلية",
        "credential3_en": "UAE-Wide Next-Day Delivery",
        "credential3_ar": "توصيل في اليوم التالي داخل الإمارات",
        "cta_shop_en": "Shop Parts",
        "cta_shop_ar": "تسوق القطع",
        "cta_finder_en": "Find Parts for Your Car",
        "cta_finder_ar": "ابحث عن قطع سيارتك"
    },
    "stats": {
        "items": [
            {
                "value_en": "10,000+",
                "value_ar": "+10,000",
                "label_en": "Parts in Stock",
                "label_ar": "قطعة في المخزون"
            },
            {
                "value_en": "500+",
                "value_ar": "+500",
                "label_en": "Vehicle Models Supported",
                "label_ar": "طراز مركبة مدعوم"
            },
            {
                "value_en": "Same-Day",
                "value_ar": "نفس اليوم",
                "label_en": "Dispatch in Dubai",
                "label_ar": "شحن في دبي"
            },
            {
                "value_en": "Genuine",
                "value_ar": "أصلية",
                "label_en": "& OEM Parts Only",
                "label_ar": "وقطع OEM فقط"
            }
        ]
    },
    "about": {
        "eyebrow_en": "Who We Are",
        "eyebrow_ar": "من نحن",
        "title_en": "Built for the UAE Driver.",
        "title_ar": "مصممة لسائق الإمارات.",
        "body_en": "ASIL sources genuine and OEM-equivalent parts from certified manufacturers across Asia, Europe and the US, then stocks them locally in Dubai — so you're not waiting weeks for a part that should take a day. From daily maintenance to full rebuilds, our catalogue is matched precisely to what's actually on UAE roads.",
        "body_ar": "تقوم أصيل بتوريد قطع أصلية ومعادلة للأصلية من مصنّعين معتمدين في آسيا وأوروبا والولايات المتحدة، ثم تخزينها محليًا في دبي — حتى لا تنتظر أسابيع لقطعة يجب أن تصل خلال يوم واحد. من الصيانة اليومية إلى الإصلاح الشامل، كتالوجنا مطابق بدقة لما هو موجود فعليًا على طرق الإمارات.",
        "link_en": "Learn More About ASIL",
        "link_ar": "المزيد عن أصيل",
        "image_tag_en": "ASIL · Dubai Distribution Centre",
        "image_tag_ar": "أصيل · مركز التوزيع في دبي",
        "image_url": "/about-warehouse.png"
    },
    "categories": {
        "eyebrow_en": "Shop By Category",
        "eyebrow_ar": "تسوق حسب الفئة",
        "title_en": "Every system, properly stocked.",
        "title_ar": "كل نظام، مخزّن كما يجب."
    },
    "products": {
        "eyebrow_en": "Best Sellers",
        "eyebrow_ar": "الأكثر مبيعًا",
        "title_en": "Parts drivers reorder.",
        "title_ar": "قطع يعيد السائقون طلبها."
    },
    "brands": {
        "eyebrow_en": "Trusted Brands",
        "eyebrow_ar": "علامات تجارية موثوقة",
        "title_en": "Authorized to distribute the names you already trust.",
        "title_ar": "معتمدون لتوزيع العلامات التي تثق بها بالفعل.",
        "description_en": "We partner with top global auto parts manufacturers to bring you authentic, high-quality components for every vehicle make and model.",
        "description_ar": "نتعاون مع أفضل مصنعي قطع غيار السيارات العالميين لنقدم لك مكونات أصلية وعالية الجودة لكل أنواع وموديلات السيارات.",
        "link_en": "See All Brands",
        "link_ar": "عرض كل العلامات التجارية"
    },
    "why": {
        "eyebrow_en": "Why ASIL",
        "eyebrow_ar": "لماذا أصيل",
        "title_en": "The details that matter more than the sale.",
        "title_ar": "التفاصيل التي تهم أكثر من البيع نفسه.",
        "items": [
            {
                "icon": "ShieldCheck",
                "title_en": "Genuine Parts Only",
                "title_ar": "قطع أصلية فقط",
                "body_en": "Every SKU is sourced directly from the manufacturer or an authorized channel — verified before it reaches our warehouse.",
                "body_ar": "كل رمز قطعة مصدره مباشر من المصنّع أو قناة معتمدة — يتم التحقق منه قبل وصوله إلى مستودعنا."
            },
            {
                "icon": "Truck",
                "title_en": "Fast UAE Delivery",
                "title_ar": "توصيل سريع في الإمارات",
                "body_en": "Same-day dispatch within Dubai, next-day across the other Emirates — tracked from our warehouse to your door.",
                "body_ar": "شحن في نفس اليوم داخل دبي، وفي اليوم التالي لبقية الإمارات — تتبع كامل من مستودعنا حتى بابك."
            },
            {
                "icon": "MessageCircle",
                "title_en": "WhatsApp Support",
                "title_ar": "دعم عبر واتساب",
                "body_en": "Send us your VIN or old part photo — our team confirms fitment before you order, not after.",
                "body_ar": "أرسل لنا رقم الشاصي أو صورة القطعة القديمة — يتحقق فريقنا من التوافق قبل الطلب، لا بعده."
            },
            {
                "icon": "RotateCcw",
                "title_en": "Easy Returns",
                "title_ar": "إرجاع سهل",
                "body_en": "Wrong fitment or changed your mind — 30 days to return, no restocking questions asked.",
                "body_ar": "قطعة غير مناسبة أو غيّرت رأيك — 30 يومًا للإرجاع دون أي تعقيد."
            }
        ]
    },
    "cta": {
        "title_en": "Can't find your part? Talk to us on WhatsApp.",
        "title_ar": "لم تجد قطعتك؟ تحدث معنا عبر واتساب.",
        "button_en": "Chat With Us",
        "button_ar": "تحدث معنا",
        "whatsapp_number": "971501234567"
    }
}
JSON;

try {
    $existing = DatabaseManager::query("SELECT id FROM home_page LIMIT 1")->fetch();

    if ($existing) {
        echo "Skipped (already seeded): home_page id={$existing['id']}
";
    } else {
        DatabaseManager::query("INSERT INTO home_page (content_json) VALUES (:content)", ['content' => $content]);
        echo "Seeded: home_page
";
    }

    echo "Home page seeding complete.
";
} catch (Exception $e) {
    echo "Error seeding home page: " . $e->getMessage() . "
";
}
