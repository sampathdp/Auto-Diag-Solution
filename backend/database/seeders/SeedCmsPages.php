<?php

declare(strict_types=1);

require_once __DIR__ . '/../../bootstrap/manual_autoload.php';

use App\Core\Database\DatabaseManager;

echo "Seeding CMS pages...\n";

$pages = [
    [
        'slug' => 'terms-and-conditions',
        'title_en' => 'Terms & Conditions',
        'title_ar' => 'الشروط والأحكام',
        'content_en' =>
            "<h2>1. Introduction</h2><p>These Terms &amp; Conditions govern your use of the ASIL Auto Parts Hub website and your purchase of products from us. By placing an order, you agree to be bound by these terms.</p>" .
            "<h2>2. Products &amp; Pricing</h2><p>All prices are displayed in UAE Dirhams (AED) and are inclusive of 5% VAT unless stated otherwise. We reserve the right to change prices, descriptions, and availability of any product at any time without prior notice.</p>" .
            "<h2>3. Orders &amp; Payment</h2><p>Orders are confirmed once payment has been successfully processed through our secure payment gateway. We accept major credit/debit cards and other payment methods displayed at checkout.</p>" .
            "<ul><li>You must provide accurate and complete billing and shipping information.</li><li>We reserve the right to refuse or cancel any order at our discretion, including in cases of suspected fraud or pricing errors.</li></ul>" .
            "<h2>4. Shipping &amp; Delivery</h2><p>Orders are typically delivered within 2–4 business days across the UAE. Free shipping applies to orders over AED 200; a flat delivery fee applies to smaller orders.</p>" .
            "<h2>5. Vehicle Compatibility</h2><p>Product listings indicate compatible vehicle makes, models, and years where applicable. It is the customer's responsibility to confirm compatibility before purchase. ASIL Auto Parts Hub is not liable for parts ordered for an incompatible vehicle.</p>" .
            "<h2>6. Limitation of Liability</h2><p>ASIL Auto Parts Hub shall not be liable for any indirect, incidental, or consequential damages arising from the use of our products or website.</p>" .
            "<h2>7. Governing Law</h2><p>These terms are governed by the laws of the United Arab Emirates. Any disputes shall be subject to the exclusive jurisdiction of the UAE courts.</p>" .
            "<h2>8. Contact Us</h2><p>For questions about these Terms &amp; Conditions, contact us at <a href='mailto:support@autopartsuae.ae'>support@autopartsuae.ae</a> or +971 4 123 4567.</p>",
        'content_ar' =>
            "<h2>١. مقدمة</h2><p>تحكم هذه الشروط والأحكام استخدامك لموقع قطع غيار السيارات الإمارات وشراءك للمنتجات منا. بإتمام الطلب، فإنك توافق على الالتزام بهذه الشروط.</p>" .
            "<h2>٢. المنتجات والأسعار</h2><p>تُعرض جميع الأسعار بالدرهم الإماراتي (AED) وتشمل ضريبة القيمة المضافة بنسبة 5% ما لم يُذكر خلاف ذلك. نحتفظ بالحق في تغيير الأسعار والأوصاف وتوفر المنتجات في أي وقت دون إشعار مسبق.</p>" .
            "<h2>٣. الطلبات والدفع</h2><p>يتم تأكيد الطلبات بعد نجاح معالجة الدفع عبر بوابة الدفع الآمنة الخاصة بنا. نقبل بطاقات الائتمان/الخصم الرئيسية وطرق الدفع الأخرى المعروضة عند إتمام الطلب.</p>" .
            "<ul><li>يجب عليك تقديم معلومات فوترة وشحن دقيقة وكاملة.</li><li>نحتفظ بالحق في رفض أو إلغاء أي طلب وفق تقديرنا، بما في ذلك حالات الاشتباه في الاحتيال أو أخطاء التسعير.</li></ul>" .
            "<h2>٤. الشحن والتوصيل</h2><p>عادةً ما يتم توصيل الطلبات خلال ٢-٤ أيام عمل في جميع أنحاء الإمارات. يتوفر الشحن المجاني للطلبات التي تزيد عن 200 درهم؛ وتُطبّق رسوم توصيل ثابتة على الطلبات الأصغر.</p>" .
            "<h2>٥. توافق المركبات</h2><p>تشير قوائم المنتجات إلى ماركات وموديلات وسنوات المركبات المتوافقة حيثما ينطبق ذلك. تقع مسؤولية التأكد من التوافق قبل الشراء على عاتق العميل. لا تتحمل قطع غيار السيارات الإمارات مسؤولية القطع المطلوبة لمركبة غير متوافقة.</p>" .
            "<h2>٦. حدود المسؤولية</h2><p>لا تتحمل قطع غيار السيارات الإمارات مسؤولية أي أضرار غير مباشرة أو عرضية أو تبعية ناتجة عن استخدام منتجاتنا أو موقعنا.</p>" .
            "<h2>٧. القانون الحاكم</h2><p>تخضع هذه الشروط لقوانين دولة الإمارات العربية المتحدة. وتختص محاكم الإمارات دون غيرها بالفصل في أي نزاعات.</p>" .
            "<h2>٨. تواصل معنا</h2><p>لأي استفسارات حول هذه الشروط والأحكام، تواصل معنا عبر <a href='mailto:support@autopartsuae.ae'>support@autopartsuae.ae</a> أو على الرقم 971 4 123 4567.</p>",
    ],
    [
        'slug' => 'refund-policy',
        'title_en' => 'Refund Policy',
        'title_ar' => 'سياسة الاسترجاع',
        'content_en' =>
            "<h2>1. Eligibility for Returns</h2><p>We accept returns within 14 days of delivery for most items, provided they are unused, in their original packaging, and accompanied by proof of purchase.</p>" .
            "<h2>2. Non-Returnable Items</h2><ul><li>Electrical parts that have been installed or connected to a vehicle</li><li>Special-order or custom-fitted parts</li><li>Items marked as final sale at checkout</li></ul>" .
            "<h2>3. How to Request a Return</h2><p>Contact our support team at <a href='mailto:support@autopartsuae.ae'>support@autopartsuae.ae</a> or via WhatsApp with your order number and reason for return. We will provide return instructions once your request is approved.</p>" .
            "<h2>4. Refund Processing</h2><p>Once we receive and inspect the returned item, refunds are processed to your original payment method within 5–7 business days. Shipping fees are non-refundable unless the return is due to our error.</p>" .
            "<h2>5. Damaged or Incorrect Items</h2><p>If you receive a damaged or incorrect part, please notify us within 48 hours of delivery with photos of the item and packaging so we can arrange a replacement or full refund at no additional cost.</p>" .
            "<h2>6. Exchanges</h2><p>Need a different size, model, or vehicle-fit part? We're happy to exchange eligible items — contact support to arrange a swap.</p>" .
            "<h2>7. Contact Us</h2><p>Questions about a return or refund? Reach us at <a href='mailto:support@autopartsuae.ae'>support@autopartsuae.ae</a> or +971 4 123 4567.</p>",
        'content_ar' =>
            "<h2>١. أهلية الإرجاع</h2><p>نقبل إرجاع معظم المنتجات خلال 14 يومًا من تاريخ التسليم، بشرط أن تكون غير مستخدمة وفي عبوتها الأصلية ومرفقة بإثبات الشراء.</p>" .
            "<h2>٢. المنتجات غير القابلة للإرجاع</h2><ul><li>القطع الكهربائية التي تم تركيبها أو توصيلها بالمركبة</li><li>القطع المطلوبة خصيصًا أو المُفصّلة حسب الطلب</li><li>المنتجات المُصنّفة كبيع نهائي عند إتمام الطلب</li></ul>" .
            "<h2>٣. كيفية طلب الإرجاع</h2><p>تواصل مع فريق الدعم لدينا عبر <a href='mailto:support@autopartsuae.ae'>support@autopartsuae.ae</a> أو عبر واتساب مع ذكر رقم الطلب وسبب الإرجاع. سنزودك بتعليمات الإرجاع بعد الموافقة على طلبك.</p>" .
            "<h2>٤. معالجة المبالغ المستردة</h2><p>بعد استلام المنتج المرتجع وفحصه، تتم معالجة المبلغ المسترد إلى وسيلة الدفع الأصلية خلال 5-7 أيام عمل. رسوم الشحن غير قابلة للاسترداد ما لم يكن الإرجاع بسبب خطأ من جانبنا.</p>" .
            "<h2>٥. المنتجات التالفة أو الخاطئة</h2><p>إذا استلمت قطعة تالفة أو خاطئة، يُرجى إبلاغنا خلال 48 ساعة من التسليم مع صور للمنتج والتغليف حتى نتمكن من ترتيب استبدال أو استرداد كامل دون أي تكلفة إضافية.</p>" .
            "<h2>٦. الاستبدال</h2><p>هل تحتاج إلى مقاس أو موديل مختلف أو قطعة متوافقة مع مركبة أخرى؟ يسعدنا استبدال المنتجات المؤهلة — تواصل مع الدعم لترتيب ذلك.</p>" .
            "<h2>٧. تواصل معنا</h2><p>لديك استفسار حول الإرجاع أو الاسترداد؟ تواصل معنا عبر <a href='mailto:support@autopartsuae.ae'>support@autopartsuae.ae</a> أو على 971 4 123 4567.</p>",
    ],
    [
        'slug' => 'privacy-policy',
        'title_en' => 'Privacy Policy',
        'title_ar' => 'سياسة الخصوصية',
        'content_en' =>
            "<h2>1. Information We Collect</h2><p>When you create an account, place an order, or contact us, we may collect your name, email address, phone number, delivery address, and payment details.</p>" .
            "<h2>2. How We Use Your Information</h2><ul><li>To process and deliver your orders</li><li>To communicate order updates, promotions, and support responses</li><li>To improve our website, products, and customer experience</li><li>To comply with legal and regulatory requirements</li></ul>" .
            "<h2>3. Payment Information</h2><p>Payments are processed securely through Stripe. We do not store your full card details on our servers.</p>" .
            "<h2>4. Cookies</h2><p>We use cookies to keep you signed in, remember your cart, and understand how visitors use our website. You can disable cookies in your browser settings, though some features may not work as intended.</p>" .
            "<h2>5. Sharing Your Information</h2><p>We do not sell your personal data. We only share information with trusted third parties — such as payment processors and delivery partners — as needed to fulfil your order.</p>" .
            "<h2>6. Data Security</h2><p>We use industry-standard security measures to protect your personal information from unauthorized access, alteration, or disclosure.</p>" .
            "<h2>7. Your Rights</h2><p>You may request access to, correction of, or deletion of your personal data at any time by contacting us at <a href='mailto:support@autopartsuae.ae'>support@autopartsuae.ae</a>.</p>" .
            "<h2>8. Changes to This Policy</h2><p>We may update this Privacy Policy from time to time. Any changes will be posted on this page with an updated revision date.</p>",
        'content_ar' =>
            "<h2>١. المعلومات التي نجمعها</h2><p>عند إنشاء حساب أو تقديم طلب أو التواصل معنا، قد نقوم بجمع اسمك وبريدك الإلكتروني ورقم هاتفك وعنوان التوصيل وتفاصيل الدفع.</p>" .
            "<h2>٢. كيفية استخدام معلوماتك</h2><ul><li>لمعالجة طلباتك وتوصيلها</li><li>لإرسال تحديثات الطلبات والعروض الترويجية وردود الدعم</li><li>لتحسين موقعنا ومنتجاتنا وتجربة العملاء</li><li>للامتثال للمتطلبات القانونية والتنظيمية</li></ul>" .
            "<h2>٣. معلومات الدفع</h2><p>تتم معالجة المدفوعات بأمان عبر Stripe. نحن لا نخزّن تفاصيل بطاقتك الكاملة على خوادمنا.</p>" .
            "<h2>٤. ملفات تعريف الارتباط (Cookies)</h2><p>نستخدم ملفات تعريف الارتباط لإبقائك مسجلاً للدخول، وتذكر سلة التسوق الخاصة بك، وفهم كيفية استخدام الزوار لموقعنا. يمكنك تعطيل ملفات تعريف الارتباط من إعدادات المتصفح، مع العلم أن بعض الميزات قد لا تعمل كما هو متوقع.</p>" .
            "<h2>٥. مشاركة معلوماتك</h2><p>نحن لا نبيع بياناتك الشخصية. نشارك المعلومات فقط مع أطراف ثالثة موثوقة — مثل معالجات الدفع وشركاء التوصيل — بالقدر اللازم لتنفيذ طلبك.</p>" .
            "<h2>٦. أمان البيانات</h2><p>نستخدم إجراءات أمنية معيارية لحماية معلوماتك الشخصية من الوصول أو التعديل أو الإفصاح غير المصرح به.</p>" .
            "<h2>٧. حقوقك</h2><p>يمكنك طلب الوصول إلى بياناتك الشخصية أو تصحيحها أو حذفها في أي وقت من خلال التواصل معنا عبر <a href='mailto:support@autopartsuae.ae'>support@autopartsuae.ae</a>.</p>" .
            "<h2>٨. التغييرات على هذه السياسة</h2><p>قد نقوم بتحديث سياسة الخصوصية هذه من وقت لآخر. سيتم نشر أي تغييرات في هذه الصفحة مع تاريخ مراجعة محدث.</p>",
    ],
];

// Shell content left over from the page's original creation — anything else is
// real admin-authored copy, so only rows still holding a placeholder get overwritten.
const PLACEHOLDER_PREFIXES = [
    '<p>Add your',
];

function isPlaceholder(?string $content): bool
{
    if ($content === null || trim($content) === '') {
        return true;
    }
    foreach (PLACEHOLDER_PREFIXES as $prefix) {
        if (str_starts_with($content, $prefix)) {
            return true;
        }
    }
    return false;
}

try {
    foreach ($pages as $row) {
        $existing = DatabaseManager::query(
            "SELECT id, content_en FROM pages WHERE slug = :slug LIMIT 1",
            ['slug' => $row['slug']]
        )->fetch();

        if (!$existing) {
            DatabaseManager::query(
                "INSERT INTO pages (slug, title_en, title_ar, content_en, content_ar, is_published)
                 VALUES (:slug, :title_en, :title_ar, :content_en, :content_ar, 1)",
                $row
            );
            echo "Seeded: {$row['slug']}\n";
            continue;
        }

        if (!isPlaceholder($existing['content_en'])) {
            echo "Skipped (already has real content): {$row['slug']}\n";
            continue;
        }

        DatabaseManager::query(
            "UPDATE pages SET title_en = :title_en, title_ar = :title_ar,
                content_en = :content_en, content_ar = :content_ar
             WHERE id = :id",
            [
                'id' => $existing['id'],
                'title_en' => $row['title_en'],
                'title_ar' => $row['title_ar'],
                'content_en' => $row['content_en'],
                'content_ar' => $row['content_ar'],
            ]
        );
        echo "Filled in placeholder content: {$row['slug']}\n";
    }

    echo "CMS pages seeding complete.\n";
} catch (Exception $e) {
    echo "Error seeding CMS pages: " . $e->getMessage() . "\n";
}
