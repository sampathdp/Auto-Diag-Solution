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
  // Added for the product-form brand picker (Phase F5) — no standalone Brands page,
  // and this key didn't exist in the original mock scaffolding.
  brands: {
    all: ["admin", "brands"] as const,
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
  media: {
    list: (filters: Record<string, unknown> = {}) => ["admin", "media", "list", filters] as const,
  },
  reports: {
    sales: ["admin", "reports", "sales"] as const,
  },
};
