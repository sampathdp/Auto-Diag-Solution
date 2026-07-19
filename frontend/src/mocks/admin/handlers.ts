import { http, HttpResponse } from "msw";
import {
  adminUsers,
  categories,
  computeDashboardAnalytics,
  computeDashboardStats,
  customerAddresses,
  customers,
  mediaItems,
  orders,
  pages,
  products,
  seoMeta,
  settings,
  vehicles,
  type AdminUser,
  type Order,
  type OrderStatus,
  type Product,
} from "./db";

/**
 * All admin endpoints live under this prefix. api-client.ts's base URL
 * (NEXT_PUBLIC_ADMIN_API_URL) must match this for MSW to intercept requests —
 * see ADMIN_ARCHITECTURE.md.
 */
const BASE = "/api/admin";

// ---------------------------------------------------------------------------
// Envelope helpers — mirrors the real backend's {success,data,error,message}
// ---------------------------------------------------------------------------
function ok<T>(data: T, message = "") {
  return HttpResponse.json({ success: true, data, error: null, message });
}
function fail(message: string, status = 400, error: unknown = null) {
  return HttpResponse.json(
    { success: false, data: null, error: error ?? message, message },
    { status }
  );
}
function paginate<T>(items: T[], url: URL) {
  const page = Number(url.searchParams.get("page") ?? 1);
  const perPage = Number(url.searchParams.get("per_page") ?? 20);
  const start = (page - 1) * perPage;
  const pageItems = items.slice(start, start + perPage);
  return {
    items: pageItems,
    meta: {
      total: items.length,
      current_page: page,
      per_page: perPage,
      total_pages: Math.max(1, Math.ceil(items.length / perPage)),
    },
  };
}

// ---------------------------------------------------------------------------
// Fake session store — token -> admin user id. Lives for the page's lifetime.
// ---------------------------------------------------------------------------
const sessions = new Map<string, number>();
let nextId = 100000;
const makeToken = (prefix: string) => `${prefix}_mock_${Math.random().toString(36).slice(2)}${nextId++}`;

function authenticate(request: Request): AdminUser | null {
  const header = request.headers.get("authorization") ?? "";
  const token = header.replace(/^Bearer\s+/i, "");
  const userId = sessions.get(token);
  if (!userId) return null;
  return adminUsers.find((u) => u.id === userId) ?? null;
}

// ---------------------------------------------------------------------------
// Auth
// ---------------------------------------------------------------------------
export const handlers = [
  http.post(`${BASE}/auth/login`, async ({ request }) => {
    const body = (await request.json()) as { email?: string; password?: string };
    const email = body.email?.trim().toLowerCase() ?? "";
    const password = body.password ?? "";

    if (!email || !/^\S+@\S+\.\S+$/.test(email) || password.length < 6) {
      return fail("Enter a valid email and a password of at least 6 characters.", 422);
    }

    // Mock convenience: any well-formed credentials succeed. Known seeded
    // admins log in as themselves; anything else logs in as the default admin.
    const user =
      adminUsers.find((u) => u.email.toLowerCase() === email) ??
      { ...adminUsers[0], email };

    const access_token = makeToken("access");
    const refresh_token = makeToken("refresh");
    sessions.set(access_token, user.id);
    sessions.set(refresh_token, user.id);
    user.last_login_at = new Date().toISOString();

    return ok({ user: withoutPassword(user), access_token, refresh_token }, "Logged in");
  }),

  http.post(`${BASE}/auth/logout`, ({ request }) => {
    const header = request.headers.get("authorization") ?? "";
    sessions.delete(header.replace(/^Bearer\s+/i, ""));
    return ok(null, "Logged out");
  }),

  http.get(`${BASE}/auth/me`, ({ request }) => {
    const user = authenticate(request);
    if (!user) return fail("Unauthenticated", 401);
    return ok(withoutPassword(user));
  }),

  http.post(`${BASE}/auth/refresh`, async ({ request }) => {
    const body = (await request.json()) as { refresh_token?: string };
    const userId = sessions.get(body.refresh_token ?? "");
    if (!userId) return fail("Invalid refresh token", 401);
    const access_token = makeToken("access");
    sessions.set(access_token, userId);
    return ok({ access_token });
  }),

  http.patch(`${BASE}/auth/me`, async ({ request }) => {
    const user = authenticate(request);
    if (!user) return fail("Unauthenticated", 401);
    const body = (await request.json()) as Partial<Pick<AdminUser, "name" | "avatar_url" | "notification_preferences">>;
    Object.assign(user, body);
    return ok(withoutPassword(user), "Profile updated");
  }),

  http.post(`${BASE}/auth/change-password`, async ({ request }) => {
    const user = authenticate(request);
    if (!user) return fail("Unauthenticated", 401);
    const body = (await request.json()) as { current_password: string; new_password: string };
    if (body.current_password !== user.password) {
      return fail("Current password is incorrect.", 422, { current_password: ["Current password is incorrect."] });
    }
    user.password = body.new_password;
    return ok(null, "Password changed");
  }),

  // ---------------------------------------------------------------------
  // Dashboard
  // ---------------------------------------------------------------------
  http.get(`${BASE}/dashboard/stats`, ({ request }) => {
    if (!authenticate(request)) return fail("Unauthenticated", 401);
    return ok(computeDashboardStats());
  }),

  http.get(`${BASE}/dashboard/analytics`, ({ request }) => {
    if (!authenticate(request)) return fail("Unauthenticated", 401);
    return ok(computeDashboardAnalytics());
  }),

  // ---------------------------------------------------------------------
  // Products
  // ---------------------------------------------------------------------
  http.get(`${BASE}/products`, ({ request }) => {
    if (!authenticate(request)) return fail("Unauthenticated", 401);
    const url = new URL(request.url);
    const search = url.searchParams.get("search")?.toLowerCase();
    const categoryId = url.searchParams.get("category_id");
    const status = url.searchParams.get("status");
    const stock = url.searchParams.get("stock");
    const sort = url.searchParams.get("sort");
    const order = url.searchParams.get("order") === "desc" ? -1 : 1;
    let list = [...products];
    if (search) {
      list = list.filter(
        (p) => p.name_en.toLowerCase().includes(search) || p.sku.toLowerCase().includes(search)
      );
    }
    if (categoryId) list = list.filter((p) => p.category_id === Number(categoryId));
    if (status) list = list.filter((p) => p.status === status);
    if (stock === "out_of_stock") list = list.filter((p) => p.stock_quantity === 0);
    else if (stock === "low_stock") {
      list = list.filter((p) => p.stock_quantity > 0 && p.stock_quantity <= p.low_stock_threshold);
    } else if (stock === "in_stock") {
      list = list.filter((p) => p.stock_quantity > p.low_stock_threshold);
    }
    if (sort) {
      list.sort((a, b) => {
        const av = a[sort as keyof typeof a];
        const bv = b[sort as keyof typeof b];
        if (typeof av === "number" && typeof bv === "number") return (av - bv) * order;
        return String(av).localeCompare(String(bv)) * order;
      });
    }
    return ok(paginate(list, url));
  }),

  http.post(`${BASE}/products`, async ({ request }) => {
    if (!authenticate(request)) return fail("Unauthenticated", 401);
    const body = (await request.json()) as Record<string, unknown>;
    const product = {
      id: Math.max(0, ...products.map((p) => p.id)) + 1,
      sku: `APU-${nextId++}`,
      name_en: "",
      name_ar: "",
      short_description_en: "",
      short_description_ar: "",
      description_en: "",
      description_ar: "",
      slug: "",
      category_id: categories[0]?.id ?? 1,
      brand_name: "",
      price: 0,
      compare_at_price: null,
      cost: null,
      vat_inclusive: true,
      stock_quantity: 0,
      low_stock_threshold: 5,
      track_inventory: true,
      images: [],
      source: "local" as const,
      status: "draft" as const,
      vehicle_ids: [],
      fits_all_vehicles: false,
      specifications: [],
      seo_title_en: "",
      seo_title_ar: "",
      seo_description_en: "",
      seo_description_ar: "",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      ...body,
    };
    products.unshift(product);
    return ok(product, "Product created");
  }),

  http.get(`${BASE}/products/:id`, ({ request, params }) => {
    if (!authenticate(request)) return fail("Unauthenticated", 401);
    const product = products.find((p) => p.id === Number(params.id));
    if (!product) return fail("Product not found", 404);
    return ok(product);
  }),

  http.put(`${BASE}/products/:id`, async ({ request, params }) => {
    if (!authenticate(request)) return fail("Unauthenticated", 401);
    const product = products.find((p) => p.id === Number(params.id));
    if (!product) return fail("Product not found", 404);
    Object.assign(product, await request.json(), { updated_at: new Date().toISOString() });
    return ok(product, "Product updated");
  }),

  http.delete(`${BASE}/products/:id`, ({ request, params }) => {
    if (!authenticate(request)) return fail("Unauthenticated", 401);
    const idx = products.findIndex((p) => p.id === Number(params.id));
    if (idx === -1) return fail("Product not found", 404);
    products.splice(idx, 1);
    return ok(null, "Product deleted");
  }),

  http.post(`${BASE}/products/:id/duplicate`, ({ request, params }) => {
    if (!authenticate(request)) return fail("Unauthenticated", 401);
    const source = products.find((p) => p.id === Number(params.id));
    if (!source) return fail("Product not found", 404);
    const id = Math.max(0, ...products.map((p) => p.id)) + 1;
    const copy: Product = {
      ...source,
      id,
      sku: `${source.sku}-COPY`,
      name_en: `${source.name_en} (Copy)`,
      name_ar: `${source.name_ar} (نسخة)`,
      slug: `${source.slug}-copy-${id}`,
      status: "draft",
      specifications: source.specifications.map((s) => ({ ...s })),
      images: [...source.images],
      vehicle_ids: [...source.vehicle_ids],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    products.unshift(copy);
    return ok(copy, "Product duplicated");
  }),

  http.post(`${BASE}/products/bulk`, async ({ request }) => {
    if (!authenticate(request)) return fail("Unauthenticated", 401);
    const body = (await request.json()) as { action: "delete" | "activate" | "deactivate"; ids: number[] };
    if (body.action === "delete") {
      for (const id of body.ids) {
        const idx = products.findIndex((p) => p.id === id);
        if (idx !== -1) products.splice(idx, 1);
      }
    } else {
      for (const id of body.ids) {
        const product = products.find((p) => p.id === id);
        if (product) product.status = body.action === "activate" ? "active" : "inactive";
      }
    }
    return ok(null, "Bulk action applied");
  }),

  // ---------------------------------------------------------------------
  // Categories
  // ---------------------------------------------------------------------
  http.get(`${BASE}/categories`, ({ request }) => {
    if (!authenticate(request)) return fail("Unauthenticated", 401);
    return ok(categories);
  }),

  http.post(`${BASE}/categories`, async ({ request }) => {
    if (!authenticate(request)) return fail("Unauthenticated", 401);
    const body = (await request.json()) as Record<string, unknown>;
    const category = {
      id: Math.max(0, ...categories.map((c) => c.id)) + 1,
      name_en: "",
      name_ar: "",
      slug: "",
      parent_id: null,
      image: null,
      description_en: "",
      description_ar: "",
      sort_order: categories.length,
      products_count: 0,
      is_active: true,
      created_at: new Date().toISOString(),
      ...body,
    };
    categories.push(category);
    return ok(category, "Category created");
  }),

  http.get(`${BASE}/categories/:id`, ({ request, params }) => {
    if (!authenticate(request)) return fail("Unauthenticated", 401);
    const category = categories.find((c) => c.id === Number(params.id));
    if (!category) return fail("Category not found", 404);
    return ok(category);
  }),

  http.put(`${BASE}/categories/:id`, async ({ request, params }) => {
    if (!authenticate(request)) return fail("Unauthenticated", 401);
    const category = categories.find((c) => c.id === Number(params.id));
    if (!category) return fail("Category not found", 404);
    Object.assign(category, await request.json());
    return ok(category, "Category updated");
  }),

  http.delete(`${BASE}/categories/:id`, ({ request, params }) => {
    if (!authenticate(request)) return fail("Unauthenticated", 401);
    const idx = categories.findIndex((c) => c.id === Number(params.id));
    if (idx === -1) return fail("Category not found", 404);
    categories.splice(idx, 1);
    return ok(null, "Category deleted");
  }),

  // ---------------------------------------------------------------------
  // Vehicles
  // ---------------------------------------------------------------------
  http.get(`${BASE}/vehicles/years`, ({ request }) => {
    if (!authenticate(request)) return fail("Unauthenticated", 401);
    return ok([...new Set(vehicles.map((v) => v.year))].sort((a, b) => b - a));
  }),

  http.get(`${BASE}/vehicles/makes`, ({ request }) => {
    if (!authenticate(request)) return fail("Unauthenticated", 401);
    const url = new URL(request.url);
    const year = url.searchParams.get("year");
    const list = year ? vehicles.filter((v) => v.year === Number(year)) : vehicles;
    return ok([...new Set(list.map((v) => v.make))].sort());
  }),

  http.get(`${BASE}/vehicles/models`, ({ request }) => {
    if (!authenticate(request)) return fail("Unauthenticated", 401);
    const url = new URL(request.url);
    const year = url.searchParams.get("year");
    const make = url.searchParams.get("make");
    let list = vehicles;
    if (year) list = list.filter((v) => v.year === Number(year));
    if (make) list = list.filter((v) => v.make === make);
    return ok([...new Set(list.map((v) => v.model))].sort());
  }),

  http.get(`${BASE}/vehicles`, ({ request }) => {
    if (!authenticate(request)) return fail("Unauthenticated", 401);
    const url = new URL(request.url);
    return ok(paginate(vehicles, url));
  }),

  http.post(`${BASE}/vehicles/import`, async ({ request }) => {
    if (!authenticate(request)) return fail("Unauthenticated", 401);
    const body = (await request.json()) as Array<{ year: number; make: string; model: string }>;
    let imported = 0;
    for (const row of body) {
      const exists = vehicles.some(
        (v) => v.year === row.year && v.make === row.make && v.model === row.model
      );
      if (!exists) {
        vehicles.push({
          id: Math.max(0, ...vehicles.map((v) => v.id)) + 1,
          year: row.year,
          make: row.make,
          model: row.model,
          chassis_code: null,
          products_count: 0,
        });
        imported++;
      }
    }
    return ok({ imported, skipped: body.length - imported }, "Import complete");
  }),

  http.post(`${BASE}/vehicles`, async ({ request }) => {
    if (!authenticate(request)) return fail("Unauthenticated", 401);
    const body = (await request.json()) as { year: number; make: string; model: string };
    const exists = vehicles.some((v) => v.year === body.year && v.make === body.make && v.model === body.model);
    if (exists) return fail("That year/make/model already exists.", 422);
    const vehicle = {
      id: Math.max(0, ...vehicles.map((v) => v.id)) + 1,
      year: body.year,
      make: body.make,
      model: body.model,
      chassis_code: null,
      products_count: 0,
    };
    vehicles.push(vehicle);
    return ok(vehicle, "Vehicle added");
  }),

  http.get(`${BASE}/vehicles/:id`, ({ request, params }) => {
    if (!authenticate(request)) return fail("Unauthenticated", 401);
    const vehicle = vehicles.find((v) => v.id === Number(params.id));
    if (!vehicle) return fail("Vehicle not found", 404);
    return ok(vehicle);
  }),

  http.put(`${BASE}/vehicles/:id`, async ({ request, params }) => {
    if (!authenticate(request)) return fail("Unauthenticated", 401);
    const vehicle = vehicles.find((v) => v.id === Number(params.id));
    if (!vehicle) return fail("Vehicle not found", 404);
    const body = (await request.json()) as { year?: number; make?: string; model?: string };
    const nextYear = body.year ?? vehicle.year;
    const nextMake = body.make ?? vehicle.make;
    const nextModel = body.model ?? vehicle.model;
    const duplicate = vehicles.some(
      (v) => v.id !== vehicle.id && v.year === nextYear && v.make === nextMake && v.model === nextModel
    );
    if (duplicate) return fail("This year/make/model combination already exists", 409);
    Object.assign(vehicle, { year: nextYear, make: nextMake, model: nextModel });
    return ok(vehicle, "Vehicle updated");
  }),

  http.delete(`${BASE}/vehicles/:id`, ({ request, params }) => {
    if (!authenticate(request)) return fail("Unauthenticated", 401);
    const idx = vehicles.findIndex((v) => v.id === Number(params.id));
    if (idx === -1) return fail("Vehicle not found", 404);
    vehicles.splice(idx, 1);
    return ok(null, "Vehicle deleted");
  }),

  // Tabs group vehicle rows by year/make/model — these two endpoints act on
  // a whole group at once (e.g. renaming "Toyota" -> "Toyota Motors" across
  // every row, or deleting every row for a given make/model/year).
  http.patch(`${BASE}/vehicles/bulk-rename`, async ({ request }) => {
    if (!authenticate(request)) return fail("Unauthenticated", 401);
    const body = (await request.json()) as {
      filter: { year?: number; make?: string; model?: string };
      update: { year?: number; make?: string; model?: string };
    };
    let count = 0;
    for (const v of vehicles) {
      const matches =
        (body.filter.year === undefined || v.year === body.filter.year) &&
        (body.filter.make === undefined || v.make === body.filter.make) &&
        (body.filter.model === undefined || v.model === body.filter.model);
      if (matches) {
        Object.assign(v, body.update);
        count++;
      }
    }
    return ok({ updated: count }, "Updated");
  }),

  http.post(`${BASE}/vehicles/bulk-delete`, async ({ request }) => {
    if (!authenticate(request)) return fail("Unauthenticated", 401);
    const body = (await request.json()) as { filter: { year?: number; make?: string; model?: string } };
    let count = 0;
    for (let i = vehicles.length - 1; i >= 0; i--) {
      const v = vehicles[i];
      const matches =
        (body.filter.year === undefined || v.year === body.filter.year) &&
        (body.filter.make === undefined || v.make === body.filter.make) &&
        (body.filter.model === undefined || v.model === body.filter.model);
      if (matches) {
        vehicles.splice(i, 1);
        count++;
      }
    }
    return ok({ deleted: count }, "Deleted");
  }),

  // ---------------------------------------------------------------------
  // Orders
  // ---------------------------------------------------------------------
  http.get(`${BASE}/orders`, ({ request }) => {
    if (!authenticate(request)) return fail("Unauthenticated", 401);
    const url = new URL(request.url);
    const status = url.searchParams.get("status");
    const paymentStatus = url.searchParams.get("payment_status");
    const customerId = url.searchParams.get("customer_id");
    const dateFrom = url.searchParams.get("date_from");
    const dateTo = url.searchParams.get("date_to");
    const search = url.searchParams.get("search")?.toLowerCase();
    let list = [...orders].sort((a, b) => b.created_at.localeCompare(a.created_at));
    if (status) list = list.filter((o) => o.status === status);
    if (paymentStatus) list = list.filter((o) => o.payment_status === paymentStatus);
    if (customerId) list = list.filter((o) => o.customer_id === Number(customerId));
    if (dateFrom) list = list.filter((o) => o.created_at >= dateFrom);
    if (dateTo) list = list.filter((o) => o.created_at <= `${dateTo}T23:59:59.999Z`);
    if (search) {
      list = list.filter(
        (o) =>
          o.order_number.toLowerCase().includes(search) ||
          o.customer_name.toLowerCase().includes(search)
      );
    }
    return ok(paginate(list, url));
  }),

  http.get(`${BASE}/orders/:id`, ({ request, params }) => {
    if (!authenticate(request)) return fail("Unauthenticated", 401);
    const order = orders.find((o) => o.id === Number(params.id));
    if (!order) return fail("Order not found", 404);
    return ok(order);
  }),

  http.patch(`${BASE}/orders/:id/status`, async ({ request, params }) => {
    if (!authenticate(request)) return fail("Unauthenticated", 401);
    const order = orders.find((o) => o.id === Number(params.id));
    if (!order) return fail("Order not found", 404);
    const body = (await request.json()) as { status: OrderStatus; reason?: string; carrier?: string; tracking_number?: string };
    order.status = body.status;
    order.status_history.push({ status: body.status, created_at: new Date().toISOString(), changed_by_name: "Admin" });
    if (body.status === "cancelled" && body.reason) order.cancellation_reason = body.reason;
    if (body.status === "shipped") {
      order.carrier = body.carrier ?? "Aramex";
      order.tracking_number = body.tracking_number ?? null;
      order.shipped_at = new Date().toISOString();
    }
    if (body.status === "delivered") order.delivered_at = new Date().toISOString();
    return ok(order as Order, "Order status updated");
  }),

  http.post(`${BASE}/orders/:id/notes`, async ({ request, params }) => {
    const admin = authenticate(request);
    if (!admin) return fail("Unauthenticated", 401);
    const order = orders.find((o) => o.id === Number(params.id));
    if (!order) return fail("Order not found", 404);
    const body = (await request.json()) as { text: string };
    const note = {
      id: Math.max(0, ...order.internal_notes.map((n) => n.id)) + 1,
      text: body.text,
      author: admin.name,
      created_at: new Date().toISOString(),
    };
    order.internal_notes.unshift(note);
    return ok(order, "Note added");
  }),

  http.post(`${BASE}/orders/:id/refund-request`, ({ request, params }) => {
    if (!authenticate(request)) return fail("Unauthenticated", 401);
    const order = orders.find((o) => o.id === Number(params.id));
    if (!order) return fail("Order not found", 404);
    order.refund_requested_at = new Date().toISOString();
    return ok(order, "Refund requested — process the actual refund in Stripe.");
  }),

  // ---------------------------------------------------------------------
  // Customers
  // ---------------------------------------------------------------------
  http.get(`${BASE}/customers`, ({ request }) => {
    if (!authenticate(request)) return fail("Unauthenticated", 401);
    const url = new URL(request.url);
    const search = url.searchParams.get("search")?.toLowerCase();
    const status = url.searchParams.get("status");
    const hasOrders = url.searchParams.get("has_orders");
    let list = [...customers];
    if (search) {
      list = list.filter(
        (c) => c.name.toLowerCase().includes(search) || c.email.toLowerCase().includes(search)
      );
    }
    if (status) list = list.filter((c) => c.status === status);
    if (hasOrders === "true") list = list.filter((c) => c.orders_count > 0);
    else if (hasOrders === "false") list = list.filter((c) => c.orders_count === 0);
    return ok(paginate(list, url));
  }),

  http.get(`${BASE}/customers/:id`, ({ request, params }) => {
    if (!authenticate(request)) return fail("Unauthenticated", 401);
    const customer = customers.find((c) => c.id === Number(params.id));
    if (!customer) return fail("Customer not found", 404);
    return ok(customer);
  }),

  http.patch(`${BASE}/customers/:id`, async ({ request, params }) => {
    if (!authenticate(request)) return fail("Unauthenticated", 401);
    const customer = customers.find((c) => c.id === Number(params.id));
    if (!customer) return fail("Customer not found", 404);
    Object.assign(customer, await request.json());
    return ok(customer, "Customer updated");
  }),

  http.get(`${BASE}/customers/:id/addresses`, ({ request, params }) => {
    if (!authenticate(request)) return fail("Unauthenticated", 401);
    return ok(customerAddresses.filter((a) => a.customer_id === Number(params.id)));
  }),

  http.post(`${BASE}/customers/:id/notes`, async ({ request, params }) => {
    const admin = authenticate(request);
    if (!admin) return fail("Unauthenticated", 401);
    const customer = customers.find((c) => c.id === Number(params.id));
    if (!customer) return fail("Customer not found", 404);
    const body = (await request.json()) as { text: string };
    const note = {
      id: Math.max(0, ...customer.internal_notes.map((n) => n.id)) + 1,
      text: body.text,
      author: admin.name,
      created_at: new Date().toISOString(),
    };
    customer.internal_notes.unshift(note);
    return ok(customer, "Note added");
  }),

  // ---------------------------------------------------------------------
  // CMS pages
  // ---------------------------------------------------------------------
  http.get(`${BASE}/pages`, ({ request }) => {
    if (!authenticate(request)) return fail("Unauthenticated", 401);
    return ok(pages);
  }),

  http.post(`${BASE}/pages`, async ({ request }) => {
    if (!authenticate(request)) return fail("Unauthenticated", 401);
    const body = (await request.json()) as Record<string, unknown>;
    const page = {
      id: Math.max(0, ...pages.map((p) => p.id)) + 1,
      title_en: "",
      title_ar: "",
      slug: "",
      content_en: "",
      content_ar: "",
      status: "draft" as const,
      visibility: "public" as const,
      seo_title_en: "",
      seo_title_ar: "",
      seo_description_en: "",
      seo_description_ar: "",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      ...body,
    };
    pages.push(page);
    return ok(page, "Page created");
  }),

  http.get(`${BASE}/pages/:id`, ({ request, params }) => {
    if (!authenticate(request)) return fail("Unauthenticated", 401);
    const page = pages.find((p) => p.id === Number(params.id));
    if (!page) return fail("Page not found", 404);
    return ok(page);
  }),

  http.put(`${BASE}/pages/:id`, async ({ request, params }) => {
    if (!authenticate(request)) return fail("Unauthenticated", 401);
    const page = pages.find((p) => p.id === Number(params.id));
    if (!page) return fail("Page not found", 404);
    Object.assign(page, await request.json(), { updated_at: new Date().toISOString() });
    return ok(page, "Page updated");
  }),

  http.delete(`${BASE}/pages/:id`, ({ request, params }) => {
    if (!authenticate(request)) return fail("Unauthenticated", 401);
    const idx = pages.findIndex((p) => p.id === Number(params.id));
    if (idx === -1) return fail("Page not found", 404);
    pages.splice(idx, 1);
    return ok(null, "Page deleted");
  }),

  // ---------------------------------------------------------------------
  // SEO
  // ---------------------------------------------------------------------
  http.get(`${BASE}/seo`, ({ request }) => {
    if (!authenticate(request)) return fail("Unauthenticated", 401);
    return ok(seoMeta);
  }),

  http.put(`${BASE}/seo`, async ({ request }) => {
    if (!authenticate(request)) return fail("Unauthenticated", 401);
    const body = (await request.json()) as { id?: number; path: string } & Record<string, unknown>;
    let entry = seoMeta.find((s) => s.id === body.id || s.path === body.path);
    if (entry) {
      Object.assign(entry, body);
    } else {
      entry = {
        id: Math.max(0, ...seoMeta.map((s) => s.id)) + 1,
        page_type: "custom",
        reference_id: null,
        title_en: "",
        title_ar: "",
        description_en: "",
        description_ar: "",
        og_image_media_id: null,
        ...body,
      };
      seoMeta.push(entry);
    }
    return ok(entry, "SEO entry saved");
  }),

  // ---------------------------------------------------------------------
  // Settings
  // ---------------------------------------------------------------------
  http.get(`${BASE}/settings`, ({ request }) => {
    if (!authenticate(request)) return fail("Unauthenticated", 401);
    return ok(settings);
  }),

  http.put(`${BASE}/settings`, async ({ request }) => {
    if (!authenticate(request)) return fail("Unauthenticated", 401);
    const body = (await request.json()) as { key: string; value: string }[] | { key: string; value: string };
    const updates = Array.isArray(body) ? body : [body];
    for (const { key, value } of updates) {
      const setting = settings.find((s) => s.key === key);
      if (setting) setting.value = value;
    }
    return ok(settings, "Settings updated");
  }),

  // ---------------------------------------------------------------------
  // Media
  // ---------------------------------------------------------------------
  http.get(`${BASE}/media`, ({ request }) => {
    if (!authenticate(request)) return fail("Unauthenticated", 401);
    const url = new URL(request.url);
    return ok(paginate([...mediaItems].sort((a, b) => b.uploaded_at.localeCompare(a.uploaded_at)), url));
  }),

  http.post(`${BASE}/media`, async ({ request }) => {
    if (!authenticate(request)) return fail("Unauthenticated", 401);
    let filename = `upload-${Date.now()}.jpg`;
    try {
      const form = await request.formData();
      const file = form.get("file");
      if (file && typeof file !== "string") filename = file.name;
    } catch {
      // JSON body fallback for non-FormData callers
    }
    const colors = ["#16233F", "#E87722", "#1E2530", "#4B5563", "#0F766E", "#7C3AED"];
    const id = Math.max(0, ...mediaItems.map((m) => m.id)) + 1;
    const item = {
      id,
      filename,
      type: "image" as const,
      mime: "image/jpeg",
      size_kb: 80 + Math.floor(Math.random() * 1700),
      width: 1200,
      height: 900,
      color: colors[id % colors.length],
      url: `/mock-media/${id}-${filename}`,
      alt_text_en: "",
      alt_text_ar: "",
      uploaded_at: new Date().toISOString(),
    };
    mediaItems.unshift(item);
    return ok(item, "Media uploaded");
  }),

  http.put(`${BASE}/media/:id`, async ({ request, params }) => {
    if (!authenticate(request)) return fail("Unauthenticated", 401);
    const item = mediaItems.find((m) => m.id === Number(params.id));
    if (!item) return fail("Media item not found", 404);
    Object.assign(item, await request.json());
    return ok(item, "Media updated");
  }),

  http.delete(`${BASE}/media/:id`, ({ request, params }) => {
    if (!authenticate(request)) return fail("Unauthenticated", 401);
    const idx = mediaItems.findIndex((m) => m.id === Number(params.id));
    if (idx === -1) return fail("Media item not found", 404);
    mediaItems.splice(idx, 1);
    return ok(null, "Media deleted");
  }),

  // ---------------------------------------------------------------------
  // Reports
  // ---------------------------------------------------------------------
  http.get(`${BASE}/reports/sales`, ({ request }) => {
    if (!authenticate(request)) return fail("Unauthenticated", 401);
    const analytics = computeDashboardAnalytics();
    const stats = computeDashboardStats();
    return ok({
      sales_by_month: analytics.sales_by_month,
      orders_by_status: analytics.orders_by_status,
      total_revenue: stats.total_revenue,
      total_orders: stats.total_orders,
    });
  }),
];

function withoutPassword(user: AdminUser) {
  const { password: _password, ...rest } = user;
  return rest;
}
