/**
 * In-memory mock database for the admin dashboard.
 *
 * This mimics the shape of the real `autoparts_uae` MySQL schema (see
 * /DB_Schema.sql and ARCHITECTURE.md §6.2) closely enough that swapping the
 * mock handlers for the real PHP backend later requires no shape changes on
 * the frontend. Arrays are mutated directly by mocks/admin/handlers.ts to
 * simulate persistence across requests within a single browser session.
 */

// ---------------------------------------------------------------------------
// Seeded RNG (deterministic across dev-server restarts, unlike Math.random)
// ---------------------------------------------------------------------------
function mulberry32(seed: number) {
  return function () {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rng = mulberry32(20260704);
const pick = <T>(arr: T[]): T => arr[Math.floor(rng() * arr.length)];
const pickN = <T>(arr: T[], n: number): T[] => {
  const copy = [...arr];
  const out: T[] = [];
  for (let i = 0; i < n && copy.length; i++) {
    out.push(copy.splice(Math.floor(rng() * copy.length), 1)[0]);
  }
  return out;
};
const int = (min: number, max: number) => Math.floor(rng() * (max - min + 1)) + min;
const daysAgo = (n: number) => new Date(Date.now() - n * 86400000).toISOString();
const hoursAgo = (n: number) => new Date(Date.now() - n * 3600000).toISOString();

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
export interface NotificationPreferences {
  order_updates: boolean;
  low_stock_alerts: boolean;
  weekly_summary: boolean;
}

export interface AdminUser {
  id: number;
  name: string;
  email: string;
  password: string; // plaintext in mock only — never do this against a real API
  role: "admin" | "manager" | "support";
  avatar_url: string | null;
  needs_password_change: boolean;
  two_factor_enabled: boolean;
  notification_preferences: NotificationPreferences;
  created_at: string;
  last_login_at: string | null;
}

export interface Category {
  id: number;
  name_en: string;
  name_ar: string;
  slug: string;
  parent_id: number | null;
  image: string | null;
  description_en: string;
  description_ar: string;
  sort_order: number;
  products_count: number;
  is_active: boolean;
  created_at: string;
}

export interface Vehicle {
  id: number;
  year: number;
  make: string;
  model: string;
  chassis_code: string | null;
  products_count: number;
}

export interface ProductSpecification {
  key_en: string;
  key_ar: string;
  value_en: string;
  value_ar: string;
}

export interface Product {
  id: number;
  sku: string;
  name_en: string;
  name_ar: string;
  short_description_en: string;
  short_description_ar: string;
  description_en: string; // Tiptap-authored HTML
  description_ar: string; // Tiptap-authored HTML
  slug: string;
  category_id: number;
  brand_name: string;
  price: number;
  compare_at_price: number | null;
  cost: number | null; // admin-only, never sent to the storefront
  vat_inclusive: boolean;
  stock_quantity: number;
  low_stock_threshold: number;
  track_inventory: boolean;
  /** MediaItem ids, in display order — images[0] is the primary/thumbnail. */
  images: number[];
  source: "local" | "3pl";
  /** "draft" = not visible on the storefront yet; active/inactive apply once published. */
  status: "draft" | "active" | "inactive";
  vehicle_ids: number[];
  fits_all_vehicles: boolean;
  specifications: ProductSpecification[];
  seo_title_en: string;
  seo_title_ar: string;
  seo_description_en: string;
  seo_description_ar: string;
  created_at: string;
  updated_at: string;
}

export type OrderStatus =
  | "pending"
  | "pending_vin_verification"
  | "processing"
  | "shipped"
  | "delivered"
  | "cancelled"
  | "refunded";

export interface OrderItem {
  product_id: number;
  sku: string;
  name_en: string;
  name_ar: string;
  unit_price: number;
  quantity: number;
}

export type PaymentStatus = "pending" | "paid" | "failed" | "refunded";

export interface OrderNote {
  id: number;
  text: string;
  author: string;
  created_at: string;
}

export interface Order {
  id: number;
  order_number: string;
  customer_id: number;
  customer_name: string;
  customer_email: string;
  status: OrderStatus;
  payment_status: PaymentStatus;
  /** Set when an admin clicks "Refund" — the real refund still happens in Stripe, this just flags intent.
   *  Mock-only field; the documented schema's payment_status enum has no equivalent state yet. */
  refund_requested_at: string | null;
  /** Full item rows — always present on the single-order endpoint; on the list endpoint only
   *  when requested via `with_items=true` (e.g. reports), otherwise undefined. */
  items?: OrderItem[];
  /** Only present on the admin order list endpoint (a cheap SUM, not the full item rows). */
  items_count?: number;
  subtotal: number;
  vat_rate: number;
  vat_amount: number;
  shipping_amount: number;
  discount_amount: number;
  total: number;
  payment_reference: string;
  /** Snapshotted at checkout — matches AddressService::shape(), not the raw customer_addresses row. */
  shipping_snapshot: {
    label?: string;
    name?: string;
    phone?: string;
    emirate: string;
    city: string;
    area: string;
    street?: string;
    building?: string;
    apartment?: string | null;
    instructions?: string | null;
  } | null;
  /** Carrier/tracking are set manually by an admin when marking an order shipped — no live courier API yet. */
  carrier: string | null;
  tracking_number: string | null;
  shipped_at: string | null;
  delivered_at: string | null;
  /** Set once the order's been pushed to Fulfillor (approve-fulfillment) — null until then. */
  fulfillor_order_id: string | null;
  fulfillor_synced_at: string | null;
  fulfillor_sync_error: string | null;
  status_history: { status: OrderStatus; note?: string | null; created_at: string; changed_by_name?: string | null }[];
  /** Mock-only structured notes; the documented schema has a plain `notes` text column. */
  internal_notes: OrderNote[];
  cancellation_reason: string | null;
  created_at: string;
}

export interface Customer {
  id: number;
  name: string;
  email: string;
  phone: string;
  emirate: string;
  city: string;
  status: "active" | "blocked";
  orders_count: number;
  total_spent: number;
  internal_notes: OrderNote[];
  created_at: string;
}

export interface CustomerAddress {
  id: number;
  customer_id: number;
  label: string;
  full_name: string;
  phone: string;
  emirate: string;
  city: string;
  area: string;
  street_address: string;
  building: string | null;
  apartment: string | null;
  is_default: boolean;
}

export interface Page {
  id: number;
  title_en: string;
  title_ar: string;
  slug: string;
  content_en: string;
  content_ar: string;
  status: "published" | "draft";
  visibility: "public" | "private";
  seo_title_en: string;
  seo_title_ar: string;
  seo_description_en: string;
  seo_description_ar: string;
  created_at: string;
  updated_at: string;
}

export interface SeoMeta {
  id: number;
  path: string;
  page_type: "page" | "category" | "product" | "custom";
  reference_id: number | null;
  title_en: string;
  title_ar: string;
  description_en: string;
  description_ar: string;
  og_image_media_id: number | null;
}

export interface Setting {
  key: string;
  value: string;
  type: "string" | "number" | "boolean" | "textarea" | "media" | "select";
  label: string;
  group: string;
  helper_text?: string;
  readonly?: boolean;
  /** For type "select" — the allowed values. */
  options?: string[];
}

export interface MediaItem {
  id: number;
  filename: string;
  type: "image" | "document";
  mime: string;
  size_kb: number;
  width: number | null;
  height: number | null;
  color: string; // placeholder swatch — mock has no real binary storage
  /** Stable fake URL, purely for the "copy URL" affordance — doesn't resolve to a real file. */
  url: string;
  alt_text_en: string;
  alt_text_ar: string;
  uploaded_at: string;
}

// ---------------------------------------------------------------------------
// Reference data
// ---------------------------------------------------------------------------
export const EMIRATES = [
  "Dubai",
  "Abu Dhabi",
  "Sharjah",
  "Ajman",
  "Ras Al Khaimah",
  "Fujairah",
  "Umm Al Quwain",
] as const;

const CITY_BY_EMIRATE: Record<string, string[]> = {
  Dubai: ["Deira", "Al Barsha", "Jumeirah", "Al Quoz"],
  "Abu Dhabi": ["Al Reem Island", "Al Khalidiyah", "Musaffah"],
  Sharjah: ["Al Nahda", "Al Majaz", "Al Qasimia"],
  Ajman: ["Al Nuaimiya", "Al Rashidiya"],
  "Ras Al Khaimah": ["Al Nakheel", "Al Dhait"],
  Fujairah: ["Al Faseel", "Sakamkam"],
  "Umm Al Quwain": ["Al Salamah"],
};

const CATEGORY_SEED: Array<[string, string]> = [
  ["Engine Parts", "قطع المحرك"],
  ["Brakes", "نظام الفرامل"],
  ["Suspension & Steering", "الهيكل والتوجيه"],
  ["Electrical & Batteries", "الكهرباء والبطاريات"],
  ["Filters", "الفلاتر"],
  ["Lighting", "الإضاءة"],
  ["Body Parts", "قطع الهيكل الخارجي"],
  ["Interior Accessories", "إكسسوارات داخلية"],
  ["Cooling System", "نظام التبريد"],
  ["Transmission", "ناقل الحركة"],
  ["Exhaust System", "نظام العادم"],
  ["Tyres & Wheels", "الإطارات والجنوط"],
];

const PART_TYPE_BY_CATEGORY: Record<string, Array<[string, string]>> = {
  "Engine Parts": [
    ["Timing Belt Kit", "طقم سير التوقيت"],
    ["Piston Ring Set", "طقم حلقات المكبس"],
    ["Engine Mount", "دعامة المحرك"],
    ["Spark Plug Set", "طقم شمعات الإشعال"],
  ],
  Brakes: [
    ["Brake Pad Set – Front", "طقم تيل فرامل أمامي"],
    ["Brake Pad Set – Rear", "طقم تيل فرامل خلفي"],
    ["Brake Disc Rotor", "قرص فرامل"],
    ["Brake Caliper", "كاليبر الفرامل"],
  ],
  "Suspension & Steering": [
    ["Shock Absorber", "ممتص الصدمات"],
    ["Control Arm", "ذراع التحكم"],
    ["Steering Rack", "علبة التوجيه"],
    ["Tie Rod End", "طرف عمود التوجيه"],
  ],
  "Electrical & Batteries": [
    ["Car Battery 70Ah", "بطارية سيارة 70 أمبير"],
    ["Alternator", "دينامو الشحن"],
    ["Starter Motor", "موتور السلف"],
    ["Ignition Coil", "بوبينة الإشعال"],
  ],
  Filters: [
    ["Oil Filter", "فلتر زيت"],
    ["Air Filter", "فلتر هواء"],
    ["Cabin Air Filter", "فلتر مكيف"],
    ["Fuel Filter", "فلتر بنزين"],
  ],
  Lighting: [
    ["Headlight Assembly", "طقم مصباح أمامي"],
    ["Tail Light Assembly", "طقم مصباح خلفي"],
    ["Fog Light Kit", "طقم أضواء الضباب"],
    ["LED Bulb Set", "طقم لمبات LED"],
  ],
  "Body Parts": [
    ["Front Bumper", "دعامة أمامية"],
    ["Side Mirror", "مرآة جانبية"],
    ["Door Handle", "مقبض الباب"],
    ["Fender Panel", "رفرف"],
  ],
  "Interior Accessories": [
    ["Floor Mat Set", "طقم دواسات أرضية"],
    ["Steering Wheel Cover", "غطاء عجلة القيادة"],
    ["Seat Cover Set", "طقم أغطية مقاعد"],
    ["Dashboard Camera", "كاميرا لوحة القيادة"],
  ],
  "Cooling System": [
    ["Radiator", "الرديتر"],
    ["Water Pump", "مضخة المياه"],
    ["Cooling Fan", "مروحة التبريد"],
    ["Thermostat", "الثرموستات"],
  ],
  Transmission: [
    ["Clutch Kit", "طقم دبرياج"],
    ["Gearbox Mount", "دعامة الجير"],
    ["CV Joint", "مفصل الكردان"],
    ["Transmission Filter", "فلتر الجير"],
  ],
  "Exhaust System": [
    ["Muffler", "الشكمان"],
    ["Catalytic Converter", "المحول الحفاز"],
    ["Exhaust Pipe", "ماسورة العادم"],
    ["Oxygen Sensor", "حساس الأكسجين"],
  ],
  "Tyres & Wheels": [
    ["All-Season Tyre 215/55R17", "إطار جميع الفصول 215/55R17"],
    ["Alloy Wheel Rim 18\"", "جنط ألمنيوم 18 بوصة"],
    ["Wheel Hub Assembly", "طقم محور العجلة"],
    ["Tyre Valve Kit", "طقم صمام الإطار"],
  ],
};

const BRANDS = [
  "Bosch",
  "Denso",
  "NGK",
  "Mann Filter",
  "Bridgestone",
  "Michelin",
  "ACDelco",
  "Valeo",
  "Continental",
  "Brembo",
  "Febi Bilstein",
  "Gates",
  "Sachs",
];

const VEHICLE_LINEUP: Record<string, string[]> = {
  Toyota: ["Camry", "Land Cruiser", "Corolla", "Hilux"],
  Nissan: ["Patrol", "Altima", "Sunny"],
  Honda: ["Accord", "Civic", "CR-V"],
  Hyundai: ["Elantra", "Tucson", "Sonata"],
  Kia: ["Sportage", "Cerato"],
  Mitsubishi: ["Pajero", "Lancer"],
  Mazda: ["6", "CX-5"],
  Ford: ["Explorer", "F-150"],
  Chevrolet: ["Tahoe", "Malibu"],
  Lexus: ["ES", "RX"],
};

const FIRST_NAMES = [
  "Ahmed", "Mohammed", "Khalid", "Omar", "Yousef", "Saeed", "Hamdan", "Rashid",
  "Fatima", "Aisha", "Mariam", "Noura", "Salma", "Hessa", "Latifa", "Sara",
  "John", "David", "Michael", "Priya", "Anjali", "Wei", "Chen",
];
const LAST_NAMES = [
  "Al Mansoori", "Al Suwaidi", "Al Falasi", "Al Marzooqi", "Al Shamsi",
  "Al Zaabi", "Al Hammadi", "Al Nuaimi", "Khan", "Fernandes", "Menon", "Tan",
];

// Subcategories demonstrating the tree — [parent name_en, name_en, name_ar]
const SUBCATEGORY_SEED: Array<[string, string, string]> = [
  ["Filters", "Oil Filters", "فلاتر الزيت"],
  ["Filters", "Air Filters", "فلاتر الهواء"],
  ["Filters", "Cabin Filters", "فلاتر المكيف"],
  ["Lighting", "Headlights", "المصابيح الأمامية"],
  ["Lighting", "Tail Lights", "المصابيح الخلفية"],
  ["Brakes", "Brake Pads", "تيل الفرامل"],
  ["Brakes", "Brake Discs", "أقراص الفرامل"],
];

function slugify(text: string) {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

// ---------------------------------------------------------------------------
// Seed generation
// ---------------------------------------------------------------------------
export const categories: Category[] = CATEGORY_SEED.map(([name_en, name_ar], i) => ({
  id: i + 1,
  name_en,
  name_ar,
  slug: slugify(name_en),
  parent_id: null,
  image: null,
  description_en: `Shop genuine ${name_en.toLowerCase()} for all major makes, delivered across the UAE.`,
  description_ar: `تسوق ${name_ar} الأصلية لجميع الماركات الكبرى، مع التوصيل لجميع أنحاء الإمارات.`,
  sort_order: i,
  products_count: 0, // backfilled below once products exist
  is_active: true,
  created_at: daysAgo(200 - i),
}));

(() => {
  let nextCategoryId = categories.length + 1;
  SUBCATEGORY_SEED.forEach(([parentNameEn, name_en, name_ar], i) => {
    const parent = categories.find((c) => c.name_en === parentNameEn)!;
    const siblingIndex = SUBCATEGORY_SEED.filter(([p], j) => p === parentNameEn && j <= i).length - 1;
    categories.push({
      id: nextCategoryId++,
      name_en,
      name_ar,
      slug: slugify(name_en),
      parent_id: parent.id,
      image: null,
      description_en: `${name_en} for all major makes, delivered across the UAE.`,
      description_ar: `${name_ar} لجميع الماركات الكبرى، مع التوصيل لجميع أنحاء الإمارات.`,
      sort_order: siblingIndex,
      products_count: 0,
      is_active: true,
      created_at: daysAgo(150 - i),
    });
  });
})();

export const vehicles: Vehicle[] = (() => {
  const list: Vehicle[] = [];
  let id = 1;
  for (const [make, models] of Object.entries(VEHICLE_LINEUP)) {
    for (const model of models) {
      const years = pickN([2018, 2019, 2020, 2021, 2022, 2023, 2024], int(2, 4)).sort();
      for (const year of years) {
        list.push({ id: id++, year, make, model, chassis_code: null, products_count: 0 });
      }
    }
  }
  return list;
})();

// Media library seed lives before products so product.images can reference
// real MediaItem ids (mediaItems[].id), matching how "add from library" works.
export const mediaItems: MediaItem[] = (() => {
  const list: MediaItem[] = [];
  const colors = ["#16233F", "#E87722", "#1E2530", "#4B5563", "#0F766E", "#7C3AED"];
  const photoDims: Array<[number, number]> = [
    [1200, 900],
    [1600, 1200],
    [1000, 1000],
    [1280, 960],
  ];
  const exts: Array<[string, string]> = [
    ["jpg", "image/jpeg"],
    ["png", "image/png"],
    ["webp", "image/webp"],
    ["pdf", "application/pdf"],
  ];
  for (let i = 1; i <= 32; i++) {
    const [ext, mime] = pick(exts);
    const isDoc = ext === "pdf";
    const category = pick(categories.filter((c) => !c.parent_id));
    const [partEn, partAr] = pick(PART_TYPE_BY_CATEGORY[category.name_en]);
    const brand = pick(BRANDS);
    const filename = `${isDoc ? "spec-sheet" : "product-photo"}-${1000 + i}.${ext}`;
    const [width, height] = isDoc ? [null, null] : pick(photoDims);
    list.push({
      id: i,
      filename,
      type: isDoc ? "document" : "image",
      mime,
      size_kb: int(40, 2400),
      width,
      height,
      color: pick(colors),
      url: `/mock-media/${i}-${slugify(filename)}`,
      alt_text_en: isDoc ? "" : `${brand} ${partEn}`,
      alt_text_ar: isDoc ? "" : `${partAr} ${brand}`,
      uploaded_at: daysAgo(int(1, 250)),
    });
  }
  return list;
})();

const MATERIALS: Array<[string, string]> = [
  ["Steel", "صلب"],
  ["Aluminum", "ألمنيوم"],
  ["Rubber", "مطاط"],
  ["Ceramic", "سيراميك"],
  ["Ceramic Composite", "مركب سيراميكي"],
  ["Ductile Iron", "حديد مرن"],
];

function buildSpecifications(): ProductSpecification[] {
  const [materialEn, materialAr] = pick(MATERIALS);
  const warrantyMonths = pick([6, 12, 18, 24]);
  return [
    { key_en: "Weight", key_ar: "الوزن", value_en: `${(int(2, 150) / 10).toFixed(1)} kg`, value_ar: `${(int(2, 150) / 10).toFixed(1)} كجم` },
    { key_en: "Material", key_ar: "الخامة", value_en: materialEn, value_ar: materialAr },
    { key_en: "Warranty", key_ar: "الضمان", value_en: `${warrantyMonths} months`, value_ar: `${warrantyMonths} شهر` },
  ];
}

const mediaImageIds = mediaItems.filter((m) => m.type === "image").map((m) => m.id);

// Products are seeded onto top-level categories only — PART_TYPE_BY_CATEGORY
// has no templates for the demo subcategories, which start empty until an
// admin assigns products to them via the edit form.
const topLevelCategories = categories.filter((c) => !c.parent_id);

export const products: Product[] = (() => {
  const list: Product[] = [];
  let id = 1;
  let skuCounter = 10000;
  for (let i = 0; i < 46; i++) {
    const category = topLevelCategories[i % topLevelCategories.length];
    const partTypes = PART_TYPE_BY_CATEGORY[category.name_en];
    const [partEn, partAr] = pick(partTypes);
    const brand = pick(BRANDS);
    const price = int(35, 1850);
    const cost = Math.round(price * (int(55, 75) / 100));
    const onSale = rng() > 0.7;
    const fitsAll = rng() > 0.85;
    const relatedVehicles = fitsAll ? [] : pickN(vehicles, int(1, 5)).map((v) => v.id);
    const statusRoll = rng();
    const status: Product["status"] = statusRoll > 0.92 ? "inactive" : statusRoll > 0.85 ? "draft" : "active";
    const trackInventory = rng() > 0.05;
    const name_en = `${brand} ${partEn}`;
    const name_ar = `${partAr} ${brand}`;
    const shortDescEn = `Genuine ${brand} ${partEn.toLowerCase()} — built for reliable performance in UAE conditions.`;
    const shortDescAr = `${partAr} ${brand} أصلي — مصمم للأداء الموثوق في ظروف الإمارات.`;
    list.push({
      id: id++,
      sku: `APU-${skuCounter++}`,
      name_en,
      name_ar,
      short_description_en: shortDescEn,
      short_description_ar: shortDescAr,
      description_en: `<p>${shortDescEn}</p><ul><li>OEM-equivalent fit and finish</li><li>Tested for GCC heat and dust conditions</li><li>Backed by the ${brand} warranty</li></ul>`,
      description_ar: `<p>${shortDescAr}</p><ul><li>مطابقة أصلية في التركيب والتشطيب</li><li>مختبر لظروف الحرارة والغبار الخليجية</li><li>مدعوم بضمان ${brand}</li></ul>`,
      slug: slugify(`${brand}-${partEn}-${id}`),
      category_id: category.id,
      brand_name: brand,
      price,
      compare_at_price: onSale ? Math.round(price * 1.2) : null,
      cost,
      vat_inclusive: rng() > 0.1,
      stock_quantity: rng() > 0.08 ? int(0, 240) : 0,
      low_stock_threshold: pick([3, 5, 5, 5, 8, 10]),
      track_inventory: trackInventory,
      images: pickN(mediaImageIds, int(1, 4)),
      source: rng() > 0.6 ? "3pl" : "local",
      status,
      vehicle_ids: relatedVehicles,
      fits_all_vehicles: fitsAll,
      specifications: buildSpecifications(),
      seo_title_en: `${name_en} | ASIL Auto Parts Hub`,
      seo_title_ar: `${name_ar} | قطع غيار السيارات الإمارات`,
      seo_description_en: shortDescEn,
      seo_description_ar: shortDescAr,
      created_at: daysAgo(int(5, 300)),
      updated_at: daysAgo(int(0, 5)),
    });
  }
  return list;
})();

// backfill products_count now that products[] exists
for (const c of categories) {
  c.products_count = products.filter((p) => p.category_id === c.id).length;
}
for (const v of vehicles) {
  v.products_count = products.filter((p) => p.vehicle_ids.includes(v.id)).length;
}

export const customers: Customer[] = (() => {
  const list: Customer[] = [];
  for (let i = 1; i <= 38; i++) {
    const emirate = pick([...EMIRATES]);
    const name = `${pick(FIRST_NAMES)} ${pick(LAST_NAMES)}`;
    list.push({
      id: i,
      name,
      email: `${name.toLowerCase().replace(/[^a-z]+/g, ".")}${i}@example.ae`,
      phone: `+9715${int(0, 9)}${int(1000000, 9999999)}`,
      emirate,
      city: pick(CITY_BY_EMIRATE[emirate]),
      status: rng() > 0.93 ? "blocked" : "active",
      orders_count: 0, // backfilled below
      total_spent: 0,
      internal_notes: [],
      created_at: daysAgo(int(10, 400)),
    });
  }
  return list;
})();

function paymentStatusFor(status: OrderStatus): PaymentStatus {
  if (status === "pending") return "pending";
  if (status === "refunded") return "refunded";
  if (status === "cancelled") return rng() > 0.8 ? "failed" : "paid";
  return "paid";
}

export const orders: Order[] = (() => {
  const list: Order[] = [];
  const statuses: OrderStatus[] = ["pending", "processing", "shipped", "delivered", "cancelled", "refunded"];
  const VAT_RATE = 0.05;
  for (let i = 1; i <= 42; i++) {
    const customer = pick(customers);
    const itemCount = int(1, 4);
    const items: OrderItem[] = pickN(products, itemCount).map((p) => ({
      product_id: p.id,
      sku: p.sku,
      name_en: p.name_en,
      name_ar: p.name_ar,
      unit_price: p.price,
      quantity: int(1, 3),
    }));
    const subtotal = items.reduce((sum, it) => sum + it.unit_price * it.quantity, 0);
    const discount_amount = rng() > 0.85 ? Math.round(subtotal * 0.1) : 0;
    const shipping_amount = subtotal >= 200 ? 0 : pick([15, 25]);
    const vat_amount = Math.round((subtotal - discount_amount) * VAT_RATE);
    const total = subtotal - discount_amount + vat_amount + shipping_amount;
    const status = pick(statuses);
    const created = int(1, 180);
    const emirate = customer.emirate;
    list.push({
      id: i,
      order_number: `AP-${String(20260000 + i)}`,
      customer_id: customer.id,
      customer_name: customer.name,
      customer_email: customer.email,
      status,
      payment_status: paymentStatusFor(status),
      refund_requested_at: null,
      items,
      subtotal,
      vat_rate: VAT_RATE,
      vat_amount,
      shipping_amount,
      discount_amount,
      total,
      payment_reference: `pi_mock_${Math.abs(Math.floor(rng() * 1e10))}`,
      shipping_snapshot: {
        name: customer.name,
        emirate,
        city: customer.city,
        area: pick(CITY_BY_EMIRATE[emirate]),
        street: `Street ${int(1, 40)}`,
        building: `Villa ${int(1, 99)}`,
      },
      carrier: status === "shipped" || status === "delivered" ? "Aramex" : null,
      tracking_number: status === "shipped" || status === "delivered" ? `${int(100000000, 999999999)}` : null,
      shipped_at: status === "shipped" || status === "delivered" ? daysAgo(Math.max(created - 1, 0)) : null,
      delivered_at: status === "delivered" ? daysAgo(Math.max(created - 2, 0)) : null,
      fulfillor_order_id: null,
      fulfillor_synced_at: null,
      fulfillor_sync_error: null,
      status_history: [
        { status: "pending", created_at: daysAgo(created), changed_by_name: null },
        ...(status !== "pending"
          ? [{ status, created_at: daysAgo(Math.max(created - 1, 0)), changed_by_name: "Admin" }]
          : []),
      ],
      internal_notes: [],
      cancellation_reason: status === "cancelled" ? pick(["Customer requested cancellation", "Out of stock", "Duplicate order"]) : null,
      created_at: daysAgo(created),
    });
  }
  return list;
})();

// Guarantee some "today" / "yesterday" activity — created_at above is
// randomized across a wide historical range, so without this the dashboard's
// day-over-day KPIs (Today's Sales, Orders Today, New Customers Today) would
// almost always compare 0 vs 0.
const recentCustomers: Customer[] = [
  {
    id: 39,
    name: "Hamdan Al Zaabi",
    email: "hamdan.al.zaabi39@example.ae",
    phone: `+9715${int(0, 9)}${int(1000000, 9999999)}`,
    emirate: "Dubai",
    city: "Al Barsha",
    status: "active",
    orders_count: 0,
    total_spent: 0,
    internal_notes: [],
    created_at: hoursAgo(4),
  },
  {
    id: 40,
    name: "Mariam Al Nuaimi",
    email: "mariam.al.nuaimi40@example.ae",
    phone: `+9715${int(0, 9)}${int(1000000, 9999999)}`,
    emirate: "Sharjah",
    city: "Al Nahda",
    status: "active",
    orders_count: 0,
    total_spent: 0,
    internal_notes: [],
    created_at: hoursAgo(9),
  },
  {
    id: 41,
    name: "Omar Al Suwaidi",
    email: "omar.al.suwaidi41@example.ae",
    phone: `+9715${int(0, 9)}${int(1000000, 9999999)}`,
    emirate: "Abu Dhabi",
    city: "Al Reem Island",
    status: "active",
    orders_count: 0,
    total_spent: 0,
    internal_notes: [],
    created_at: daysAgo(1),
  },
];
customers.push(...recentCustomers);

const recentOrderSeeds: Array<{ customer: Customer; created_at: string }> = [
  { customer: recentCustomers[0], created_at: hoursAgo(1) },
  { customer: recentCustomers[1], created_at: hoursAgo(3) },
  { customer: pick(customers), created_at: hoursAgo(6) },
  { customer: pick(customers), created_at: hoursAgo(10) },
  { customer: recentCustomers[2], created_at: daysAgo(1) },
  { customer: pick(customers), created_at: daysAgo(1) },
];

let nextOrderId = Math.max(...orders.map((o) => o.id)) + 1;
for (const seed of recentOrderSeeds) {
  const items: OrderItem[] = pickN(products, int(1, 3)).map((p) => ({
    product_id: p.id,
    sku: p.sku,
    name_en: p.name_en,
    name_ar: p.name_ar,
    unit_price: p.price,
    quantity: int(1, 2),
  }));
  const subtotal = items.reduce((sum, it) => sum + it.unit_price * it.quantity, 0);
  const shipping_amount = subtotal >= 200 ? 0 : 15;
  const vat_amount = Math.round(subtotal * 0.05);
  const total = subtotal + vat_amount + shipping_amount;
  const status: OrderStatus = pick(["pending", "processing"]);
  const orderId = nextOrderId++;
  orders.push({
    id: orderId,
    order_number: `AP-${String(20260000 + orderId)}`,
    customer_id: seed.customer.id,
    customer_name: seed.customer.name,
    customer_email: seed.customer.email,
    status,
    payment_status: paymentStatusFor(status),
    refund_requested_at: null,
    items,
    subtotal,
    vat_rate: 0.05,
    vat_amount,
    shipping_amount,
    discount_amount: 0,
    total,
    payment_reference: `pi_mock_${Math.abs(Math.floor(rng() * 1e10))}`,
    shipping_snapshot: {
      name: seed.customer.name,
      emirate: seed.customer.emirate,
      city: seed.customer.city,
      area: pick(CITY_BY_EMIRATE[seed.customer.emirate]),
      street: `Street ${int(1, 40)}`,
      building: `Villa ${int(1, 99)}`,
    },
    carrier: null,
    tracking_number: null,
    shipped_at: null,
    delivered_at: null,
    fulfillor_order_id: null,
    fulfillor_synced_at: null,
    fulfillor_sync_error: null,
    status_history: [{ status: "pending", created_at: seed.created_at, changed_by_name: null }],
    internal_notes: [],
    cancellation_reason: null,
    created_at: seed.created_at,
  });
}

for (const c of customers) {
  const custOrders = orders.filter((o) => o.customer_id === c.id);
  c.orders_count = custOrders.length;
  c.total_spent = custOrders.reduce((sum, o) => sum + o.total, 0);
}

// A couple of seeded internal notes so the Notes tab/panel has something to show on first look.
customers[0].internal_notes.push({
  id: 1,
  text: "Called about a delayed delivery — resolved, offered 10% off next order.",
  author: "Sara Al Mansoori",
  created_at: daysAgo(12),
});
orders[0].internal_notes.push({
  id: 1,
  text: "Customer requested gift wrapping — noted for warehouse.",
  author: "Sara Al Mansoori",
  created_at: daysAgo(3),
});

const ADDRESS_LABELS = ["Home", "Work", "Other"];

export const customerAddresses: CustomerAddress[] = (() => {
  const list: CustomerAddress[] = [];
  let id = 1;
  for (const c of customers) {
    const addressCount = int(1, 2);
    for (let i = 0; i < addressCount; i++) {
      list.push({
        id: id++,
        customer_id: c.id,
        label: ADDRESS_LABELS[i] ?? "Home",
        full_name: c.name,
        phone: c.phone,
        emirate: c.emirate,
        city: c.city,
        area: pick(CITY_BY_EMIRATE[c.emirate]),
        street_address: `Street ${int(1, 40)}`,
        building: `Villa ${int(1, 99)}`,
        apartment: rng() > 0.6 ? `Apt ${int(1, 20)}` : null,
        is_default: i === 0,
      });
    }
  }
  return list;
})();

export const adminUsers: AdminUser[] = [
  {
    id: 1,
    name: "Sara Al Mansoori",
    email: "admin@autopartsuae.ae",
    password: "Admin@12345",
    role: "admin",
    avatar_url: null,
    needs_password_change: false,
    two_factor_enabled: false,
    notification_preferences: { order_updates: true, low_stock_alerts: true, weekly_summary: false },
    created_at: daysAgo(365),
    last_login_at: daysAgo(0),
  },
  {
    id: 2,
    name: "Yousef Al Falasi",
    email: "manager@autopartsuae.ae",
    password: "Manager@12345",
    role: "manager",
    avatar_url: null,
    needs_password_change: false,
    two_factor_enabled: false,
    notification_preferences: { order_updates: true, low_stock_alerts: false, weekly_summary: true },
    created_at: daysAgo(200),
    last_login_at: daysAgo(2),
  },
];

export const pages: Page[] = [
  {
    id: 1,
    title_en: "Terms & Conditions",
    title_ar: "الشروط والأحكام",
    slug: "terms-and-conditions",
    content_en: "",
    content_ar: "",
    status: "published",
    visibility: "public",
    seo_title_en: "Terms & Conditions | ASIL Auto Parts Hub",
    seo_title_ar: "الشروط والأحكام | قطع غيار السيارات الإمارات",
    seo_description_en: "Read the terms and conditions for shopping with ASIL Auto Parts Hub.",
    seo_description_ar: "اطلع على الشروط والأحكام للتسوق مع قطع غيار السيارات الإمارات.",
    created_at: daysAgo(300),
    updated_at: daysAgo(30),
  },
  {
    id: 2,
    title_en: "Refund Policy",
    title_ar: "سياسة الاسترجاع",
    slug: "refund-policy",
    content_en: "",
    content_ar: "",
    status: "published",
    visibility: "public",
    seo_title_en: "Refund Policy | ASIL Auto Parts Hub",
    seo_title_ar: "سياسة الاسترجاع | قطع غيار السيارات الإمارات",
    seo_description_en: "Learn how returns and refunds work at ASIL Auto Parts Hub.",
    seo_description_ar: "تعرف على كيفية عمل الإرجاع والاسترداد لدى قطع غيار السيارات الإمارات.",
    created_at: daysAgo(300),
    updated_at: daysAgo(45),
  },
  {
    id: 3,
    title_en: "Privacy Policy",
    title_ar: "سياسة الخصوصية",
    slug: "privacy-policy",
    content_en: "",
    content_ar: "",
    status: "published",
    visibility: "public",
    seo_title_en: "Privacy Policy | ASIL Auto Parts Hub",
    seo_title_ar: "سياسة الخصوصية | قطع غيار السيارات الإمارات",
    seo_description_en: "How ASIL Auto Parts Hub collects, uses, and protects your data.",
    seo_description_ar: "كيف تقوم قطع غيار السيارات الإمارات بجمع بياناتك واستخدامها وحمايتها.",
    created_at: daysAgo(300),
    updated_at: daysAgo(45),
  },
  {
    id: 4,
    title_en: "About Us",
    title_ar: "من نحن",
    slug: "about-us",
    content_en: "<p>ASIL Auto Parts Hub has been supplying genuine parts since 2015...</p>",
    content_ar: "<p>تقوم شركة قطع غيار السيارات الإمارات بتوريد القطع الأصلية منذ 2015...</p>",
    status: "draft",
    visibility: "private",
    seo_title_en: "About Us | ASIL Auto Parts Hub",
    seo_title_ar: "من نحن | قطع غيار السيارات الإمارات",
    seo_description_en: "Learn about ASIL Auto Parts Hub's story and mission.",
    seo_description_ar: "تعرف على قصة ومهمة قطع غيار السيارات الإمارات.",
    created_at: daysAgo(10),
    updated_at: daysAgo(3),
  },
];

// This only holds CUSTOM overrides — the SEO Manager page merges these with
// computed defaults for every category/product/page so the table always
// shows every route, whether or not an override has been saved for it yet.
export const seoMeta: SeoMeta[] = [
  {
    id: 1,
    path: "/",
    page_type: "custom",
    reference_id: null,
    title_en: "ASIL Auto Parts Hub — Genuine Car Parts Delivered Across the Emirates",
    title_ar: "قطع غيار السيارات الإمارات — قطع أصلية توصيل لكل الإمارات",
    description_en: "Shop genuine auto parts for all major makes, delivered across the UAE.",
    description_ar: "تسوق قطع غيار أصلية لجميع الماركات مع توصيل لجميع أنحاء الإمارات.",
    og_image_media_id: null,
  },
  ...categories.slice(0, 6).map((c, i) => ({
    id: i + 2,
    path: `/category/${c.slug}`,
    page_type: "category" as const,
    reference_id: c.id,
    title_en: `${c.name_en} | ASIL Auto Parts Hub`,
    title_ar: `${c.name_ar} | قطع غيار السيارات الإمارات`,
    description_en: `Shop ${c.name_en.toLowerCase()} at the best prices in the UAE.`,
    description_ar: `تسوق ${c.name_ar} بأفضل الأسعار في الإمارات.`,
    og_image_media_id: null,
  })),
];

export const settings: Setting[] = [
  // General
  { key: "site_name", value: "ASIL Auto Parts Hub", type: "string", label: "Site Name (EN)", group: "General" },
  { key: "site_name_ar", value: "قطع غيار السيارات الإمارات", type: "string", label: "Site Name (AR)", group: "General" },
  { key: "site_logo_media_id", value: "", type: "media", label: "Site Logo", group: "General" },
  { key: "favicon_media_id", value: "", type: "media", label: "Favicon", group: "General" },
  { key: "contact_email", value: "support@autopartsuae.ae", type: "string", label: "Contact Email", group: "General" },
  { key: "contact_phone", value: "+971 4 123 4567", type: "string", label: "Contact Phone", group: "General" },
  { key: "maintenance_mode", value: "false", type: "boolean", label: "Maintenance Mode", group: "General" },

  // Localization
  { key: "default_language", value: "en", type: "select", options: ["en", "ar"], label: "Default Language", group: "Localization" },
  {
    key: "supported_languages",
    value: "en,ar",
    type: "string",
    label: "Supported Languages",
    group: "Localization",
    helper_text: "Comma-separated locale codes.",
  },
  { key: "default_currency", value: "AED", type: "string", label: "Default Currency", group: "Localization", readonly: true, helper_text: "Locked — UAE storefront only." },
  { key: "timezone", value: "Asia/Dubai", type: "string", label: "Timezone", group: "Localization", readonly: true },

  // Tax & VAT
  { key: "vat_rate", value: "5", type: "number", label: "VAT Rate (%)", group: "Tax & VAT" },
  {
    key: "vat_display",
    value: "inclusive",
    type: "select",
    options: ["inclusive", "exclusive"],
    label: "VAT Display on Product Page",
    group: "Tax & VAT",
  },

  // Payment
  { key: "stripe_publishable_key", value: "pk_test_mock_51xxx", type: "string", label: "Stripe Publishable Key", group: "Payment" },
  {
    key: "stripe_webhook_url",
    value: "https://api.autopartsuae.ae/webhooks/stripe",
    type: "string",
    label: "Webhook URL",
    group: "Payment",
    readonly: true,
    helper_text: "Configure this URL in the Stripe dashboard.",
  },
  { key: "payment_mode", value: "test", type: "select", options: ["test", "live"], label: "Payment Mode", group: "Payment" },

  // Shipping
  { key: "default_shipping_fee", value: "15", type: "number", label: "Default Shipping Fee (AED)", group: "Shipping" },
  { key: "free_shipping_threshold", value: "200", type: "number", label: "Free Shipping Threshold (AED)", group: "Shipping" },
  { key: "delivery_time_en", value: "2–4 business days across the UAE", type: "string", label: "Delivery Estimate (EN)", group: "Shipping" },
  { key: "delivery_time_ar", value: "٢-٤ أيام عمل في جميع أنحاء الإمارات", type: "string", label: "Delivery Estimate (AR)", group: "Shipping" },

  // WhatsApp
  { key: "whatsapp_number", value: "+971501234567", type: "string", label: "WhatsApp Number", group: "WhatsApp" },
  {
    key: "whatsapp_greeting_en",
    value: "Hi! How can we help you find the right auto part today?",
    type: "textarea",
    label: "Default Greeting (EN)",
    group: "WhatsApp",
  },
  {
    key: "whatsapp_greeting_ar",
    value: "مرحبًا! كيف يمكننا مساعدتك في العثور على قطعة الغيار المناسبة اليوم؟",
    type: "textarea",
    label: "Default Greeting (AR)",
    group: "WhatsApp",
  },
  { key: "whatsapp_enabled", value: "true", type: "boolean", label: "Enable Floating Button", group: "WhatsApp" },

  // Analytics
  { key: "ga_tracking_id", value: "G-MOCK123456", type: "string", label: "GA4 Property ID", group: "Analytics" },
  {
    key: "ga_credentials_json",
    value: "",
    type: "textarea",
    label: "GA Service Account Credentials (JSON)",
    group: "Analytics",
    helper_text: "Pasted here only to be forwarded to the backend — never rendered back in full.",
  },
  { key: "meta_pixel_id", value: "", type: "string", label: "Meta Pixel ID", group: "Analytics" },

  // Email
  { key: "smtp_host", value: "smtp.mailtrap.io", type: "string", label: "SMTP Host", group: "Email" },
  { key: "smtp_port", value: "587", type: "number", label: "SMTP Port", group: "Email" },
  { key: "smtp_user", value: "mock_smtp_user", type: "string", label: "SMTP Username", group: "Email" },
  { key: "smtp_password", value: "••••••••", type: "string", label: "SMTP Password", group: "Email" },
  { key: "smtp_from_name", value: "ASIL Auto Parts Hub", type: "string", label: "From Name", group: "Email" },
  { key: "smtp_from_email", value: "no-reply@autopartsuae.ae", type: "string", label: "From Email", group: "Email" },

  // Legal
  { key: "legal_terms_page_id", value: "1", type: "select", label: "Terms & Conditions Page", group: "Legal" },
  { key: "legal_refund_page_id", value: "2", type: "select", label: "Refund Policy Page", group: "Legal" },
  { key: "legal_privacy_page_id", value: "3", type: "select", label: "Privacy Policy Page", group: "Legal" },
];

// ---------------------------------------------------------------------------
// Dashboard analytics (derived from the arrays above so numbers stay consistent)
// ---------------------------------------------------------------------------
function isSameCalendarDay(iso: string, reference: Date) {
  const d = new Date(iso);
  return (
    d.getFullYear() === reference.getFullYear() &&
    d.getMonth() === reference.getMonth() &&
    d.getDate() === reference.getDate()
  );
}

function pctChange(today: number, yesterday: number) {
  if (yesterday === 0) return today > 0 ? 100 : 0;
  return Math.round(((today - yesterday) / yesterday) * 1000) / 10;
}

export function computeDashboardStats() {
  const now = new Date();
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);

  const billableOrders = orders.filter((o) => o.status !== "cancelled" && o.status !== "refunded");
  const totalRevenue = billableOrders.reduce((sum, o) => sum + o.total, 0);

  const todayOrders = billableOrders.filter((o) => isSameCalendarDay(o.created_at, now));
  const yesterdayOrders = billableOrders.filter((o) => isSameCalendarDay(o.created_at, yesterday));
  const todaySales = todayOrders.reduce((sum, o) => sum + o.total, 0);
  const yesterdaySales = yesterdayOrders.reduce((sum, o) => sum + o.total, 0);

  const todayNewCustomers = customers.filter((c) => isSameCalendarDay(c.created_at, now)).length;
  const yesterdayNewCustomers = customers.filter((c) => isSameCalendarDay(c.created_at, yesterday)).length;

  const pendingOrders = orders.filter((o) => o.status === "pending").length;
  // Inclusive of true zero stock — the most urgent form of "low stock".
  const trackedProducts = products.filter((p) => p.track_inventory);
  const lowStock = trackedProducts.filter((p) => p.stock_quantity <= p.low_stock_threshold).length;
  const outOfStock = trackedProducts.filter((p) => p.stock_quantity === 0).length;

  return {
    total_revenue: totalRevenue,
    total_orders: orders.length,
    total_customers: customers.length,
    total_products: products.length,
    pending_orders: pendingOrders,
    low_stock_count: lowStock,
    out_of_stock_count: outOfStock,
    revenue_change_pct: 8.4,
    orders_change_pct: 5.1,

    today_sales: todaySales,
    yesterday_sales: yesterdaySales,
    today_sales_change_pct: pctChange(todaySales, yesterdaySales),
    today_orders: todayOrders.length,
    yesterday_orders: yesterdayOrders.length,
    today_orders_change_pct: pctChange(todayOrders.length, yesterdayOrders.length),
    today_new_customers: todayNewCustomers,
    yesterday_new_customers: yesterdayNewCustomers,
    today_new_customers_change_pct: pctChange(todayNewCustomers, yesterdayNewCustomers),
  };
}

export function computeDashboardAnalytics() {
  const months = Array.from({ length: 6 }, (_, i) => {
    const d = new Date();
    d.setMonth(d.getMonth() - (5 - i));
    return d.toLocaleString("en-US", { month: "short" });
  });
  const salesByMonth = months.map((month, i) => ({
    month,
    revenue: int(18000, 62000) + i * 1500,
    orders: int(40, 140),
  }));

  const ordersByStatus = (
    ["pending", "processing", "shipped", "delivered", "cancelled", "refunded"] as OrderStatus[]
  ).map((status) => ({
    status,
    count: orders.filter((o) => o.status === status).length,
  }));

  const topProducts = [...products]
    .sort((a, b) => b.price - a.price)
    .slice(0, 5)
    .map((p) => ({ name: p.name_en, sales: int(10, 90) }));

  // Synthetic GA-like traffic — this is the one metric here that isn't
  // derivable from our own store data. The dashboard shows a "connect GA4"
  // placeholder instead of this by default (see settings.ga_tracking_id).
  const dailyTraffic = Array.from({ length: 30 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (29 - i));
    const sessions = int(180, 420);
    return {
      date: d.toLocaleDateString("en-GB", { day: "2-digit", month: "short" }),
      sessions,
      page_views: sessions + int(200, 900),
    };
  });

  // Real data, derived from actual order timestamps (unlike traffic above).
  const dailyRevenue = Array.from({ length: 14 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (13 - i));
    const revenue = orders
      .filter((o) => o.status !== "cancelled" && o.status !== "refunded" && isSameCalendarDay(o.created_at, d))
      .reduce((sum, o) => sum + o.total, 0);
    return { date: d.toLocaleDateString("en-GB", { day: "2-digit", month: "short" }), revenue };
  });

  // Traffic/page-views is the one metric here that would really come from
  // GA4, not our own order data — gate the chart on whether ga_tracking_id
  // has been changed away from the seeded placeholder (see Settings page).
  const gaSetting = settings.find((s) => s.key === "ga_tracking_id");
  const gaConnected = !!gaSetting?.value && !gaSetting.value.startsWith("G-MOCK");

  return {
    sales_by_month: salesByMonth,
    orders_by_status: ordersByStatus,
    top_products: topProducts,
    daily_traffic: dailyTraffic,
    daily_revenue: dailyRevenue,
    ga_connected: gaConnected,
  };
}
