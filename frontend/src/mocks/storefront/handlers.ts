import { http, HttpResponse } from "msw";
import {
  customerProfile,
  updateCustomerProfile,
  customerAddresses,
  customerVehicles,
  customerOrders,
  customerWishlist,
  customerNotificationPreferences,
} from "./db";
import { mockProducts } from "./data";

const BASE = "*/api/v1/account";

function ok<T>(data: T, message = "") {
  return HttpResponse.json({ success: true, data, error: null, message });
}

function fail(message: string, status = 400, error: unknown = null) {
  return HttpResponse.json(
    { success: false, data: null, error: error ?? message, message },
    { status }
  );
}

export const accountHandlers = [
  // Profile
  http.get(`${BASE}/me`, () => {
    return ok(customerProfile);
  }),

  http.patch(`${BASE}/me`, async ({ request }) => {
    const body = await request.json() as any;
    updateCustomerProfile(body);
    return ok(customerProfile, "Profile updated successfully");
  }),

  http.post(`${BASE}/me/change-password`, async ({ request }) => {
    const body = await request.json() as any;
    if (!body.current_password || !body.new_password) {
      return fail("Missing required fields", 422);
    }
    return ok(null, "Password changed successfully");
  }),

  http.delete(`${BASE}/me`, () => {
    return ok(null, "Account deleted successfully");
  }),

  // Vehicles
  http.get(`${BASE}/vehicles`, () => {
    return ok(customerVehicles);
  }),

  http.post(`${BASE}/vehicles`, async ({ request }) => {
    if (customerVehicles.length >= 5) {
      return fail("Maximum of 5 vehicles allowed", 400);
    }
    const body = await request.json() as any;
    
    const isDuplicate = customerVehicles.some(v => 
      v.year === Number(body.year) && 
      v.make.toLowerCase() === body.make.toLowerCase() && 
      v.model.toLowerCase() === body.model.toLowerCase() && 
      (v.trim || "").toLowerCase() === (body.trim || "").toLowerCase()
    );

    if (isDuplicate) {
      return fail("This vehicle is already in your garage.", 409);
    }

    const newVehicle = {
      id: Math.floor(Math.random() * 10000),
      user_id: customerProfile.id,
      year: Number(body.year),
      make: body.make,
      model: body.model,
      trim: body.trim || "",
      body_type: body.body_type || "",
      engine: body.engine || "",
      fuel_type: body.fuel_type || "",
      transmission: body.transmission || "",
      drive_type: body.drive_type || "",
      color: body.color || "",
      vin: body.vin || "",
      license_plate: body.license_plate || "",
      mileage: body.mileage ? Number(body.mileage) : undefined,
      nickname: body.nickname || "",
      purchase_date: body.purchase_date || "",
      is_default: customerVehicles.length === 0 || body.is_default,
    };
    
    if (newVehicle.is_default) {
      customerVehicles.forEach((v) => (v.is_default = false));
    }

    customerVehicles.push(newVehicle);
    return ok(newVehicle, "Vehicle added successfully");
  }),

  http.patch(`${BASE}/vehicles/:id`, async ({ request, params }) => {
    const id = Number(params.id);
    const body = await request.json() as any;
    const vehicle = customerVehicles.find((v) => v.id === id);
    if (!vehicle) return fail("Vehicle not found", 404);

    const isDuplicate = customerVehicles.some(v => 
      v.id !== id &&
      v.year === Number(body.year) && 
      v.make.toLowerCase() === body.make.toLowerCase() && 
      v.model.toLowerCase() === body.model.toLowerCase() && 
      (v.trim || "").toLowerCase() === (body.trim || "").toLowerCase()
    );

    if (isDuplicate) {
      return fail("This vehicle is already in your garage.", 409);
    }

    if (body.is_default) {
      customerVehicles.forEach((v) => (v.is_default = false));
    }

    Object.assign(vehicle, {
      ...body,
      year: body.year ? Number(body.year) : vehicle.year,
      mileage: body.mileage ? Number(body.mileage) : vehicle.mileage,
    });

    return ok(vehicle, "Vehicle updated successfully");
  }),

  http.delete(`${BASE}/vehicles/:id`, ({ params }) => {
    const id = Number(params.id);
    const index = customerVehicles.findIndex((v) => v.id === id);
    if (index === -1) return fail("Vehicle not found", 404);
    const deleted = customerVehicles.splice(index, 1)[0];
    
    if (deleted.is_default && customerVehicles.length > 0) {
      // Prompt logic is UI-side. Here we just clear it or auto-set another.
      // We'll let UI handle setting a new default if they want, or we auto-set the first one.
      customerVehicles[0].is_default = true;
    }

    return ok(null, "Vehicle removed");
  }),

  http.post(`${BASE}/vehicles/:id/default`, ({ params }) => {
    const id = Number(params.id);
    let found = false;
    customerVehicles.forEach((v) => {
      if (v.id === id) {
        v.is_default = true;
        found = true;
      } else {
        v.is_default = false;
      }
    });
    if (!found) return fail("Vehicle not found", 404);
    return ok(null, "Default vehicle updated");
  }),

  http.get(`/api/v1/vehicles/part-count`, ({ request }) => {
    const url = new URL(request.url);
    const make = url.searchParams.get("make");
    const model = url.searchParams.get("model");
    
    if (!make || !model) return ok({ count: 0 });
    
    // Fake logic for part count lookup
    const hash = make.length * model.length * 13;
    const count = 500 + (hash % 15000); 
    
    return ok({ count });
  }),

  // Addresses
  http.get(`${BASE}/addresses`, () => {
    return ok(customerAddresses);
  }),

  http.post(`${BASE}/addresses`, async ({ request }) => {
    const body = await request.json() as any;
    const newAddress = {
      id: Math.floor(Math.random() * 10000),
      user_id: customerProfile.id,
      ...body,
      is_default: customerAddresses.length === 0,
    };
    customerAddresses.push(newAddress);
    return ok(newAddress, "Address added successfully");
  }),

  http.patch(`${BASE}/addresses/:id`, async ({ request, params }) => {
    const id = Number(params.id);
    const body = await request.json() as any;
    const address = customerAddresses.find((a) => a.id === id);
    if (!address) return fail("Address not found", 404);
    Object.assign(address, body);
    return ok(address, "Address updated successfully");
  }),

  http.delete(`${BASE}/addresses/:id`, ({ params }) => {
    const id = Number(params.id);
    const index = customerAddresses.findIndex((a) => a.id === id);
    if (index === -1) return fail("Address not found", 404);
    customerAddresses.splice(index, 1);
    return ok(null, "Address removed");
  }),

  http.post(`${BASE}/addresses/:id/default`, ({ params }) => {
    const id = Number(params.id);
    let found = false;
    customerAddresses.forEach((a) => {
      if (a.id === id) {
        a.is_default = true;
        found = true;
      } else {
        a.is_default = false;
      }
    });
    if (!found) return fail("Address not found", 404);
    return ok(null, "Default address updated");
  }),

  // Orders
  http.get(`${BASE}/orders`, ({ request }) => {
    const url = new URL(request.url);
    const page = Number(url.searchParams.get("page") || 1);
    const perPage = Number(url.searchParams.get("per_page") || 10);
    const status = url.searchParams.get("status");
    const search = url.searchParams.get("q")?.toLowerCase();
    const dateRange = url.searchParams.get("date_range");

    let filtered = [...customerOrders];

    // Status filter
    if (status && status !== "all") {
      filtered = filtered.filter((o) => o.status === status);
    }

    // Search filter (order number or product name)
    if (search) {
      filtered = filtered.filter(
        (o) =>
          o.order_number.toLowerCase().includes(search) ||
          o.items.some((item) => item.name_en.toLowerCase().includes(search) || item.name_ar.toLowerCase().includes(search))
      );
    }

    // Date range filter
    if (dateRange) {
      const now = new Date();
      const cutoff = new Date();
      if (dateRange === "30_days") cutoff.setDate(now.getDate() - 30);
      else if (dateRange === "3_months") cutoff.setMonth(now.getMonth() - 3);
      else if (dateRange === "1_year") cutoff.setFullYear(now.getFullYear() - 1);
      
      if (dateRange !== "all") {
        filtered = filtered.filter((o) => new Date(o.created_at) >= cutoff);
      }
    }

    // Sort descending by date
    const sorted = filtered.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    
    const start = (page - 1) * perPage;
    const paginated = sorted.slice(start, start + perPage);

    return ok({
      items: paginated,
      meta: {
        total: sorted.length,
        current_page: page,
        per_page: perPage,
        total_pages: Math.ceil(sorted.length / perPage)
      }
    });
  }),

  http.get(`${BASE}/orders/:id`, ({ params }) => {
    const id = Number(params.id);
    const order = customerOrders.find((o) => o.id === id);
    if (!order) return fail("Order not found", 404);
    return ok(order);
  }),

  http.post(`${BASE}/orders/:id/reorder`, ({ params }) => {
    // In a real app, this adds items to cart and returns the cart snapshot
    // Mocking out-of-stock logic for demo:
    const mockStockIssue = Math.random() > 0.5;
    if (mockStockIssue) {
      return ok({ cart_items: 1, out_of_stock: ["Bosch Brake Pads"] }, "Partial reorder");
    }
    return ok({ cart_items: 2 }, "Items added to cart");
  }),

  http.post(`${BASE}/orders/:id/cancel`, ({ params }) => {
    const id = Number(params.id);
    const order = customerOrders.find((o) => o.id === id);
    if (!order) return fail("Order not found", 404);
    
    if (order.status !== "pending" && order.status !== "processing") {
      return fail("Order cannot be cancelled at this stage", 400);
    }
    
    order.status = "cancelled";
    return ok(order, "Order cancelled successfully");
  }),

  http.post(`${BASE}/orders/:id/refund`, ({ params }) => {
    const id = Number(params.id);
    const order = customerOrders.find((o) => o.id === id);
    if (!order) return fail("Order not found", 404);
    
    if (order.status !== "delivered") {
      return fail("Can only request refund for delivered orders", 400);
    }
    
    order.status = "refunded"; // Or "refund_requested" if that status existed, but we'll use refunded for demo
    return ok(order, "Refund requested successfully");
  }),

  // Wishlist
  http.get(`${BASE}/wishlist`, () => {
    // Map wishlist product IDs to full product objects
    const wishlistProducts = customerWishlist
      .map(id => mockProducts.find(p => p.id === id))
      .filter(Boolean);
    return ok(wishlistProducts);
  }),

  http.post(`${BASE}/wishlist/:productId`, ({ params }) => {
    const productId = params.productId as string;
    if (!customerWishlist.includes(productId)) {
      customerWishlist.push(productId);
    }
    return ok(null, "Added to wishlist");
  }),

  http.delete(`${BASE}/wishlist/clear`, () => {
    customerWishlist.length = 0;
    return ok(null, "Wishlist cleared");
  }),

  http.delete(`${BASE}/wishlist/:productId`, ({ params }) => {
    const productId = params.productId as string;
    const index = customerWishlist.indexOf(productId);
    if (index > -1) {
      customerWishlist.splice(index, 1);
    }
    return ok(null, "Removed from wishlist");
  }),

  // Notifications
  http.get(`${BASE}/notifications/preferences`, () => {
    return ok(customerNotificationPreferences);
  }),

  http.patch(`${BASE}/notifications/preferences`, async ({ request }) => {
    const body = await request.json() as any;
    Object.assign(customerNotificationPreferences, body);
    return ok(customerNotificationPreferences, "Preferences updated");
  }),
];
