/**
 * React Query key factory for the admin dashboard. Convention: every key is
 * namespaced under "admin" so admin cache entries never collide with the
 * storefront's query keys, then by resource, then by variant/filters.
 */
export const adminQueryKeys = {
  auth: {
    me: ["admin", "auth", "me"] as const,
  },
  dashboard: {
    stats: ["admin", "dashboard", "stats"] as const,
    analytics: ["admin", "dashboard", "analytics"] as const,
  },
  products: {
    list: (filters: Record<string, unknown> = {}) => ["admin", "products", "list", filters] as const,
    detail: (id: number) => ["admin", "products", "detail", id] as const,
  },
  categories: {
    all: ["admin", "categories"] as const,
  },
  brands: {
    // Fixed key used by the product-form brand picker (fetches the full list, no filters).
    all: ["admin", "brands"] as const,
    // Filtered/paginated key used by the standalone Brands admin page.
    list: (filters: Record<string, unknown> = {}) => ["admin", "brands", "list", filters] as const,
  },
  vehicles: {
    list: (filters: Record<string, unknown> = {}) => ["admin", "vehicles", "list", filters] as const,
    years: ["admin", "vehicles", "years"] as const,
    makes: (year?: string) => ["admin", "vehicles", "makes", year ?? null] as const,
    models: (year?: string, make?: string) => ["admin", "vehicles", "models", year ?? null, make ?? null] as const,
  },
  orders: {
    list: (filters: Record<string, unknown> = {}) => ["admin", "orders", "list", filters] as const,
    detail: (id: number) => ["admin", "orders", "detail", id] as const,
  },
  customers: {
    list: (filters: Record<string, unknown> = {}) => ["admin", "customers", "list", filters] as const,
    detail: (id: number) => ["admin", "customers", "detail", id] as const,
    addresses: (id: number) => ["admin", "customers", "addresses", id] as const,
  },
  pages: {
    all: ["admin", "pages"] as const,
    detail: (id: number) => ["admin", "pages", "detail", id] as const,
  },
  seo: {
    all: ["admin", "seo"] as const,
  },
  settings: {
    all: ["admin", "settings"] as const,
  },
  staff: {
    all: ["admin", "staff"] as const,
    list: ["admin", "staff", "list"] as const,
    catalogue: ["admin", "staff", "catalogue"] as const,
    permissions: (id: number) => ["admin", "staff", "permissions", id] as const,
  },
  b2bDealers: {
    all: ["admin", "b2b-dealers"] as const,
    list: (filters: Record<string, unknown> = {}) => ["admin", "b2b-dealers", "list", filters] as const,
    detail: (id: number) => ["admin", "b2b-dealers", "detail", id] as const,
  },
  outbox: {
    all: ["admin", "outbox"] as const,
    list: (filters: Record<string, unknown> = {}) => ["admin", "outbox", "list", filters] as const,
  },
  media: {
    list: (filters: Record<string, unknown> = {}) => ["admin", "media", "list", filters] as const,
  },
  reports: {
    sales: ["admin", "reports", "sales"] as const,
  },
  shipping: {
    districts: (filters: Record<string, unknown> = {}) => ["admin", "shipping", "districts", filters] as const,
    // Fixed key used by the Rates tab's district picker (fetches the full list, no filters).
    allDistricts: ["admin", "shipping", "districts", "all"] as const,
    rates: (filters: Record<string, unknown> = {}) => ["admin", "shipping", "rates", filters] as const,
  },
  salesReps: {
    all: ["admin", "sales-reps"] as const,
    list: (filters: Record<string, unknown> = {}) => ["admin", "sales-reps", "list", filters] as const,
    detail: (id: number) => ["admin", "sales-reps", "detail", id] as const,
  },
  promoCodes: {
    all: ["admin", "promo-codes"] as const,
    list: (filters: Record<string, unknown> = {}) => ["admin", "promo-codes", "list", filters] as const,
    detail: (id: number) => ["admin", "promo-codes", "detail", id] as const,
    report: (id: number, filters: Record<string, unknown> = {}) => ["admin", "promo-codes", "report", id, filters] as const,
  },
  commissions: {
    all: ["admin", "commissions"] as const,
    list: (filters: Record<string, unknown> = {}) => ["admin", "commissions", "list", filters] as const,
    dashboard: ["admin", "commissions", "dashboard"] as const,
  },
};
