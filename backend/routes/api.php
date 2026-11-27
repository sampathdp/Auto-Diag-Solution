<?php

declare(strict_types=1);

/** @var App\Core\Router\Router $router */

use App\Controllers\AuthController;
use App\Controllers\UserController;
use App\Controllers\CategoryController;
use App\Controllers\BrandController;
use App\Controllers\VehicleController;
use App\Controllers\MediaController;
use App\Controllers\ProductController;
use App\Controllers\SettingController;
use App\Controllers\PageController;
use App\Controllers\AboutPageController;
use App\Controllers\HomePageController;
use App\Controllers\SeoMetaController;
use App\Controllers\SupplierController;
use App\Controllers\OrderController;
use App\Controllers\CustomerController;
use App\Controllers\ReviewController;
use App\Controllers\DashboardController;
use App\Controllers\SalesRepController;
use App\Controllers\PromoCodeController;
use App\Controllers\CommissionController;
use App\Controllers\AccountController;
use App\Controllers\AccountAddressController;
use App\Controllers\AccountVehicleController;
use App\Controllers\AccountWishlistController;
use App\Controllers\AccountOrderController;
use App\Controllers\AccountNotificationController;
use App\Controllers\CheckoutController;
use App\Controllers\OrderTrackingController;
use App\Controllers\ShippingController;
use App\Middleware\AuthMiddleware;
use App\Middleware\PermissionMiddleware;
use App\Middleware\RoleMiddleware;
use App\Support\Permissions;

// API v1 Routes
$v1 = '/api/v1';

// --- Static file serving (uploads proxied through API so nginx doesn't need /uploads/ config) ---
$router->get("$v1/storage/{type}/{file}", [App\Controllers\StorageController::class, 'serve']);

// --- Public Auth Routes ---
$router->post("$v1/auth/register", [AuthController::class, 'register']);
$router->post("$v1/auth/login", [AuthController::class, 'login']);
$router->post("$v1/auth/refresh", [AuthController::class, 'refresh']);
$router->post("$v1/auth/forgot-password", [AuthController::class, 'forgotPassword']);
$router->post("$v1/auth/reset-password", [AuthController::class, 'resetPassword']);
$router->post("$v1/auth/google", [AuthController::class, 'googleLogin']);
$router->post("$v1/auth/facebook", [AuthController::class, 'facebookLogin']);

// --- Public storefront routes ---
$router->get("$v1/brands", [BrandController::class, 'active']);
$router->get("$v1/categories", [CategoryController::class, 'active']);
$router->get("$v1/vehicles/filters", [VehicleController::class, 'filters']);
$router->get("$v1/vehicles/part-count", [VehicleController::class, 'partCount']);
$router->get("$v1/shipping/districts", [ShippingController::class, 'publicDistricts']);
$router->get("$v1/reviews/featured", [ReviewController::class, 'featured']);
// /products/{id} is registered after /products so a literal path never gets swallowed
// by the {id} wildcard (mirrors the /vehicles/filters-before-{id} ordering below).
$router->get("$v1/products", [ProductController::class, 'publicIndex']);
$router->get("$v1/products/{id}", [ProductController::class, 'publicShow']);
$router->get("$v1/footer-pages", [PageController::class, 'footerPages']);
$router->get("$v1/pages/{slug}", [PageController::class, 'publicShow']);
$router->get("$v1/announcement", [SettingController::class, 'publicAnnouncement']);
$router->get("$v1/about-page", [AboutPageController::class, 'show']);
$router->get("$v1/home-page", [HomePageController::class, 'show']);
$router->get("$v1/partner/info", [App\Controllers\B2B\PartnerController::class, 'info']);

// Guest checkout — no login required, customer + shipping details are typed in at
// checkout instead of pulled from a saved account. Kept separate from the authenticated
// /account/checkout above (still requires AuthMiddleware for saved-address checkout).
$router->get("$v1/checkout/payment-methods", [CheckoutController::class, 'guestPaymentMethods']);
$router->post("$v1/checkout/guest", [CheckoutController::class, 'guestStore']);

// Order-confirmation-email tracking link — unauthenticated, guarded by the token in the
// URL instead of a JWT (see OrderTrackingController) since guest customers have no
// session to authenticate with.
$router->get("$v1/orders/track/{orderNumber}", [OrderTrackingController::class, 'show']);
$router->post("$v1/orders/track/{orderNumber}/payment-proof", [OrderTrackingController::class, 'uploadPaymentProof']);

// Public contact form — no login required.
$router->post("$v1/contact", [App\Controllers\ContactMessageController::class, 'store']);

// Checkout-time promo code preview — never trusted for the actual order. CheckoutService
// independently re-validates and recalculates everything server-side at order placement.
$router->post("$v1/promo-codes/validate", [PromoCodeController::class, 'validatePublic']);

// Fulfillor order-status webhook — necessarily unauthenticated (Fulfillor's server
// calls this, not a logged-in browser); gated by a shared secret header instead of a
// JWT. See FulfillorWebhookController for details.
$router->post("$v1/webhooks/fulfillor", [App\Controllers\FulfillorWebhookController::class, 'handle']);

// --- Protected Auth Routes ---
$router->get("$v1/auth/me", [AuthController::class, 'me'], [AuthMiddleware::class]);
$router->post("$v1/auth/change-password", [AuthController::class, 'changePassword'], [AuthMiddleware::class]);
$router->post("$v1/auth/logout", [AuthController::class, 'logout'], [AuthMiddleware::class]);
$router->get("$v1/auth/2fa/status", [App\Controllers\TwoFactorController::class, 'status'], [AuthMiddleware::class]);
$router->post("$v1/auth/2fa/setup", [App\Controllers\TwoFactorController::class, 'setup'], [AuthMiddleware::class]);
$router->post("$v1/auth/2fa/confirm", [App\Controllers\TwoFactorController::class, 'confirm'], [AuthMiddleware::class]);
$router->post("$v1/auth/2fa/disable", [App\Controllers\TwoFactorController::class, 'disable'], [AuthMiddleware::class]);

// --- Customer Account Routes ---
// Any authenticated user (customers in practice) managing their own profile, addresses,
// garage vehicles, wishlist, orders, and notification preferences.
$router->group([
    'prefix' => "$v1/account",
    'middleware' => [AuthMiddleware::class],
], function ($router) {
    $router->get('/me', [AccountController::class, 'me']);
    $router->put('/me', [AccountController::class, 'update']);
    $router->post('/me/change-password', [AccountController::class, 'changePassword']);
    $router->delete('/me', [AccountController::class, 'destroy']);

    $router->get('/addresses', [AccountAddressController::class, 'index']);
    $router->post('/addresses', [AccountAddressController::class, 'store']);
    $router->put('/addresses/{id}', [AccountAddressController::class, 'update']);
    $router->delete('/addresses/{id}', [AccountAddressController::class, 'destroy']);
    $router->post('/addresses/{id}/default', [AccountAddressController::class, 'setDefault']);

    $router->get('/vehicles', [AccountVehicleController::class, 'index']);
    $router->post('/vehicles', [AccountVehicleController::class, 'store']);
    $router->put('/vehicles/{id}', [AccountVehicleController::class, 'update']);
    $router->delete('/vehicles/{id}', [AccountVehicleController::class, 'destroy']);
    $router->post('/vehicles/{id}/default', [AccountVehicleController::class, 'setDefault']);

    // /wishlist/clear is registered before /wishlist/{productId} so the router's
    // first-match-wins resolution doesn't swallow "clear" as a product id.
    $router->get('/wishlist', [AccountWishlistController::class, 'index']);
    $router->delete('/wishlist/clear', [AccountWishlistController::class, 'clear']);
    $router->post('/wishlist/{productId}', [AccountWishlistController::class, 'store']);
    $router->delete('/wishlist/{productId}', [AccountWishlistController::class, 'destroy']);

    $router->get('/orders', [AccountOrderController::class, 'index']);
    // /orders/refund-photos is a literal POST path, registered before /orders/{id} for
    // consistency with this file's "static before wildcard" convention (see /vehicles/
    // filters above) — no actual GET/{id} collision since it's POST-only.
    $router->post('/orders/refund-photos', [AccountOrderController::class, 'uploadRefundPhoto']);
    $router->get('/orders/{id}', [AccountOrderController::class, 'show']);
    $router->post('/orders/{id}/cancel', [AccountOrderController::class, 'cancel']);
    $router->post('/orders/{id}/refund', [AccountOrderController::class, 'refund']);
    $router->post('/orders/{id}/reorder', [AccountOrderController::class, 'reorder']);
    // Bank transfer receipt (private storage); only while the transfer is awaited.
    $router->post('/orders/{id}/payment-proof', [AccountOrderController::class, 'uploadPaymentProof']);

    $router->get('/notifications/preferences', [AccountNotificationController::class, 'show']);
    $router->put('/notifications/preferences', [AccountNotificationController::class, 'update']);

    // B2B dealer application: always the caller's own profile (no profile id accepted).
    $router->get('/dealer', [App\Controllers\B2B\DealerAccountController::class, 'show']);
    $router->put('/dealer/application', [App\Controllers\B2B\DealerAccountController::class, 'saveDraft']);
    $router->post('/dealer/documents', [App\Controllers\B2B\DealerAccountController::class, 'uploadDocument']);
    $router->get('/dealer/documents/{id}', [App\Controllers\B2B\DealerAccountController::class, 'document']);
    $router->post('/dealer/submit', [App\Controllers\B2B\DealerAccountController::class, 'submit']);
    // Wholesale prices for products on screen; approved dealers only (403 otherwise).
    $router->post('/dealer/pricing', [App\Controllers\B2B\DealerPricingController::class, 'prices']);
    // Quotations: always the caller's own (another dealer's id is a 404).
    $dealerQuotes = App\Controllers\B2B\DealerQuotationController::class;
    $router->get('/dealer/quotations', [$dealerQuotes, 'index']);
    $router->get('/dealer/quotations/{id}', [$dealerQuotes, 'show']);
    $router->post('/dealer/quotations/{id}/messages', [$dealerQuotes, 'message']);
    $router->post('/dealer/quotations/{id}/accept', [$dealerQuotes, 'accept']);
    $router->post('/dealer/quotations/{id}/reject', [$dealerQuotes, 'reject']);

    // Checkout. Payment methods come from PaymentMethodPolicy (B2B list for an active
    // dealer); the order is placed unpaid and an admin confirms the payment later.
    $router->get('/checkout/payment-methods', [CheckoutController::class, 'paymentMethods']);
    $router->post('/checkout', [CheckoutController::class, 'store']);
});

// --- Admin Routes ---
// Every route registered inside this group requires a valid JWT AND the 'admin' role —
// grouped so new admin-only endpoints (Phase 2+) can't accidentally skip the role check.
$router->group([
    'prefix' => "$v1/admin",
    'middleware' => [AuthMiddleware::class, [RoleMiddleware::class, ['admin']]],
], function ($router) {
    // --- User / Staff Management ---
    // staff.manage (super admins hold it implicitly). Changing permissions themselves is
    // further restricted to super admins inside UserController::updatePermissions.
    $staff = [[PermissionMiddleware::class, Permissions::STAFF_MANAGE]];
    $router->get('/permissions', [UserController::class, 'permissionCatalogue'], $staff);
    $router->get('/users', [UserController::class, 'index'], $staff);
    $router->post('/users', [UserController::class, 'store'], $staff);
    $router->get('/users/{id}/permissions', [UserController::class, 'showPermissions'], $staff);
    $router->put('/users/{id}/permissions', [UserController::class, 'updatePermissions'], $staff);
    $router->put('/users/{id}', [UserController::class, 'update'], $staff);
    $router->delete('/users/{id}', [UserController::class, 'destroy'], $staff);

    // --- Categories ---
    $router->get('/categories', [CategoryController::class, 'index']);
    $router->post('/categories', [CategoryController::class, 'store']);
    $router->get('/categories/{id}', [CategoryController::class, 'show']);
    $router->put('/categories/{id}', [CategoryController::class, 'update']);
    $router->delete('/categories/{id}', [CategoryController::class, 'destroy']);

    // --- Brands ---
    $router->get('/brands', [BrandController::class, 'index']);
    $router->post('/brands', [BrandController::class, 'store']);
    $router->get('/brands/{id}', [BrandController::class, 'show']);
    $router->put('/brands/{id}', [BrandController::class, 'update']);
    $router->delete('/brands/{id}', [BrandController::class, 'destroy']);

    // --- Vehicles (Year/Make/Model fitment catalog) ---
    // /vehicles/filters is registered before /vehicles/{id} — the router matches
    // routes in registration order and {id} would otherwise swallow "filters".
    $router->get('/vehicles/filters', [VehicleController::class, 'filters']);
    $router->get('/vehicles', [VehicleController::class, 'index']);
    $router->post('/vehicles', [VehicleController::class, 'store']);
    // /vehicles/bulk is a literal POST path, not a GET/PUT/DELETE {id} match, so it
    // doesn't strictly need to precede {id} — kept here anyway, grouped with the other
    // static-before-wildcard registrations for consistency.
    $router->post('/vehicles/bulk', [VehicleController::class, 'bulkStore']);
    $router->get('/vehicles/{id}', [VehicleController::class, 'show']);
    $router->put('/vehicles/{id}', [VehicleController::class, 'update']);
    $router->delete('/vehicles/{id}', [VehicleController::class, 'destroy']);

    // --- Shipping (districts + their rates, managed as separate resources) ---
    $router->get('/shipping/districts', [ShippingController::class, 'indexDistricts']);
    $router->post('/shipping/districts', [ShippingController::class, 'storeDistrict']);
    $router->get('/shipping/districts/{id}', [ShippingController::class, 'showDistrict']);
    $router->put('/shipping/districts/{id}', [ShippingController::class, 'updateDistrict']);
    $router->delete('/shipping/districts/{id}', [ShippingController::class, 'destroyDistrict']);

    $router->get('/shipping/rates', [ShippingController::class, 'indexRates']);
    $router->post('/shipping/rates', [ShippingController::class, 'storeRate']);
    $router->get('/shipping/rates/{id}', [ShippingController::class, 'showRate']);
    $router->put('/shipping/rates/{id}', [ShippingController::class, 'updateRate']);
    $router->delete('/shipping/rates/{id}', [ShippingController::class, 'destroyRate']);

    // --- Media library ---
    $router->get('/media', [MediaController::class, 'index']);
    $router->post('/media', [MediaController::class, 'store']);
    $router->put('/media/{id}', [MediaController::class, 'update']);
    $router->delete('/media/{id}', [MediaController::class, 'destroy']);

    // --- Products ---
    $router->get('/products', [ProductController::class, 'index']);
    // Wholesale CSV backfill: literal paths before /products/{id}.
    $pricingManage = [[PermissionMiddleware::class, Permissions::B2B_PRICING_MANAGE]];
    $router->get('/products/wholesale/export', [ProductController::class, 'exportWholesale'], $pricingManage);
    $router->post('/products/wholesale/import', [ProductController::class, 'importWholesale'], $pricingManage);
    $router->post('/products', [ProductController::class, 'store']);
    $router->get('/products/{id}', [ProductController::class, 'show']);
    $router->put('/products/{id}', [ProductController::class, 'update']);
    $router->delete('/products/{id}', [ProductController::class, 'destroy']);
    $router->put('/products/{id}/specifications', [ProductController::class, 'updateSpecifications']);
    $router->put('/products/{id}/vehicles', [ProductController::class, 'updateFitment']);
    $router->post('/products/{id}/fulfillor/link', [App\Controllers\FulfillorController::class, 'linkProduct']);
    $router->post('/products/{id}/fulfillor/create', [App\Controllers\FulfillorController::class, 'createProduct']);
    $router->post('/fulfillor/send-products', [App\Controllers\FulfillorController::class, 'sendProducts']);
    $router->post('/fulfillor/sync-stock',[App\Controllers\FulfillorController::class, 'syncStock']);

    // --- Settings ---
    // /settings/bulk is registered before /settings/{key} — same "specific route
    // before wildcard" reasoning as /vehicles/filters above.
    $router->get('/settings', [SettingController::class, 'index']);
    $router->post('/settings', [SettingController::class, 'store']);
    $router->put('/settings/bulk', [SettingController::class, 'bulkUpdate']);
    $router->get('/settings/{key}', [SettingController::class, 'show']);
    $router->put('/settings/{key}', [SettingController::class, 'update']);
    $router->delete('/settings/{key}', [SettingController::class, 'destroy']);

    // --- CMS Pages ---
    $router->get('/pages', [PageController::class, 'index']);
    $router->post('/pages', [PageController::class, 'store']);
    $router->get('/pages/{id}', [PageController::class, 'show']);
    $router->put('/pages/{id}', [PageController::class, 'update']);
    $router->delete('/pages/{id}', [PageController::class, 'destroy']);

    // --- About Us page (singleton) ---
    $router->get('/about-page', [AboutPageController::class, 'show']);
    $router->put('/about-page', [AboutPageController::class, 'update']);

    // --- Home page (singleton) ---
    $router->get('/home-page', [HomePageController::class, 'show']);
    $router->put('/home-page', [HomePageController::class, 'update']);

    // --- SEO Meta ---
    $router->get('/seo', [SeoMetaController::class, 'index']);
    $router->post('/seo', [SeoMetaController::class, 'store']);
    $router->get('/seo/{id}', [SeoMetaController::class, 'show']);
    $router->put('/seo/{id}', [SeoMetaController::class, 'update']);
    $router->delete('/seo/{id}', [SeoMetaController::class, 'destroy']);

    // --- Suppliers ---
    $router->get('/suppliers', [SupplierController::class, 'index']);
    $router->post('/suppliers', [SupplierController::class, 'store']);
    $router->get('/suppliers/{id}', [SupplierController::class, 'show']);
    $router->put('/suppliers/{id}', [SupplierController::class, 'update']);
    $router->delete('/suppliers/{id}', [SupplierController::class, 'destroy']);

    // --- Orders ---
    $router->get('/orders', [OrderController::class, 'index']);
    $router->get('/orders/{id}', [OrderController::class, 'show']);
    $router->put('/orders/{id}/status', [OrderController::class, 'updateStatus']);
    // Recording money received needs payments.confirm (super admins hold it).
    $paymentsConfirm = [[PermissionMiddleware::class, Permissions::PAYMENTS_CONFIRM]];
    $router->put('/orders/{id}/payment-status', [OrderController::class, 'updatePaymentStatus'], $paymentsConfirm);
    $router->post('/orders/{id}/confirm-payment', [OrderController::class, 'confirmPayment'], $paymentsConfirm);
    $router->get('/orders/{id}/payment-proofs/{proofId}', [OrderController::class, 'paymentProof'], $paymentsConfirm);
    $router->post('/orders/{id}/refund-request', [OrderController::class, 'requestRefund']);
    $router->post('/orders/{id}/notes', [OrderController::class, 'addNote']);
    $router->post('/orders/{id}/verify-vin', [OrderController::class, 'verifyVin']);
    $router->post('/orders/{id}/approve-fulfillment',[OrderController::class, 'approveFulfillment']);
    $router->post('/orders/{id}/sync-fulfillment', [OrderController::class, 'syncFulfillment']);

    // --- Customers (users with role = 'customer') ---
    $router->get('/customers', [CustomerController::class, 'index']);
    $router->get('/customers/{id}', [CustomerController::class, 'show']);
    $router->put('/customers/{id}', [CustomerController::class, 'update']);
    $router->get('/customers/{id}/addresses', [CustomerController::class, 'addresses']);
    $router->post('/customers/{id}/notes', [CustomerController::class, 'addNote']);

    // --- Review moderation ---
    $router->get('/reviews', [ReviewController::class, 'index']);
    $router->get('/reviews/{id}', [ReviewController::class, 'show']);
    $router->put('/reviews/{id}/approve', [ReviewController::class, 'approve']);
    $router->put('/reviews/{id}/reject', [ReviewController::class, 'reject']);
    $router->delete('/reviews/{id}', [ReviewController::class, 'destroy']);

    // --- Dashboard ---
    $router->get('/dashboard/stats', [DashboardController::class, 'stats']);

    // --- B2B: dealer applications and dealers ---
    $dealersView = [[PermissionMiddleware::class, Permissions::B2B_APPLICATIONS_VIEW]];
    $dealersReview = [[PermissionMiddleware::class, Permissions::B2B_APPLICATIONS_REVIEW]];
    $dealersSuspend = [[PermissionMiddleware::class, Permissions::B2B_DEALERS_SUSPEND]];
    $b2bDealers = App\Controllers\B2B\DealerAdminController::class;
    $router->get('/b2b/dealers', [$b2bDealers, 'index'], $dealersView);
    $router->get('/b2b/dealers/{id}', [$b2bDealers, 'show'], $dealersView);
    $router->post('/b2b/dealers/{id}/notes', [$b2bDealers, 'addNote'], $dealersView);
    $router->post('/b2b/dealers/{id}/start-review', [$b2bDealers, 'startReview'], $dealersReview);
    $router->post('/b2b/dealers/{id}/request-info', [$b2bDealers, 'requestInfo'], $dealersReview);
    $router->post('/b2b/dealers/{id}/approve', [$b2bDealers, 'approve'], $dealersReview);
    $router->post('/b2b/dealers/{id}/reject', [$b2bDealers, 'reject'], $dealersReview);
    $router->post('/b2b/dealers/{id}/suspend', [$b2bDealers, 'suspend'], $dealersSuspend);
    $router->post('/b2b/dealers/{id}/reactivate', [$b2bDealers, 'reactivate'], $dealersSuspend);
    $router->put('/b2b/dealers/{id}/credit', [$b2bDealers, 'updateCredit'], [[PermissionMiddleware::class, Permissions::B2B_CREDIT_MANAGE]]);
    $router->put('/b2b/dealers/{id}/quotation-rule', [$b2bDealers, 'updateQuotationRule'], $dealersReview);
    $router->get('/b2b/documents/{id}', [$b2bDealers, 'document'], [[PermissionMiddleware::class, Permissions::B2B_DOCUMENTS_VIEW]]);

    // --- B2B: quotations (manage = view, edit, message; approve = approve or reject) ---
    $quotesManage = [[PermissionMiddleware::class, Permissions::B2B_QUOTATIONS_MANAGE]];
    $quotesApprove = [[PermissionMiddleware::class, Permissions::B2B_QUOTATIONS_APPROVE]];
    $b2bQuotes = App\Controllers\B2B\QuotationAdminController::class;
    $router->get('/b2b/quotations', [$b2bQuotes, 'index'], $quotesManage);
    $router->get('/b2b/quotations/{id}', [$b2bQuotes, 'show'], $quotesManage);
    $router->post('/b2b/quotations/{id}/start-review', [$b2bQuotes, 'startReview'], $quotesManage);
    $router->post('/b2b/quotations/{id}/revise', [$b2bQuotes, 'revise'], $quotesManage);
    $router->post('/b2b/quotations/{id}/messages', [$b2bQuotes, 'message'], $quotesManage);
    $router->post('/b2b/quotations/{id}/approve', [$b2bQuotes, 'approve'], $quotesApprove);
    $router->post('/b2b/quotations/{id}/reject', [$b2bQuotes, 'reject'], $quotesApprove);

    // --- Email outbox (delivery log + resend) ---
    $router->get('/notifications/outbox', [App\Controllers\NotificationOutboxController::class, 'index']);
    $router->post('/notifications/outbox/{id}/resend', [App\Controllers\NotificationOutboxController::class, 'resend'], $staff);

    // --- Sales Representatives ---
    $router->get('/sales-representatives', [SalesRepController::class, 'index']);
    $router->post('/sales-representatives', [SalesRepController::class, 'store']);
    $router->get('/sales-representatives/{id}', [SalesRepController::class, 'show']);
    $router->put('/sales-representatives/{id}', [SalesRepController::class, 'update']);
    $router->delete('/sales-representatives/{id}', [SalesRepController::class, 'destroy']);

    // --- Promo Codes ---
    // /promo-codes/{id}/report is registered before the plain {id} routes below — same
    // "literal before wildcard" convention as /vehicles/filters above (both are GET, so
    // it would otherwise be swallowed by GET /promo-codes/{id}).
    $router->get('/promo-codes/{id}/report', [PromoCodeController::class, 'report']);
    $router->get('/promo-codes', [PromoCodeController::class, 'index']);
    $router->post('/promo-codes', [PromoCodeController::class, 'store']);
    $router->get('/promo-codes/{id}', [PromoCodeController::class, 'show']);
    $router->put('/promo-codes/{id}', [PromoCodeController::class, 'update']);
    $router->delete('/promo-codes/{id}', [PromoCodeController::class, 'destroy']);

    // --- Commissions ---
    $router->get('/commissions/dashboard', [CommissionController::class, 'dashboard']);
    $router->get('/commissions', [CommissionController::class, 'index']);
    $router->get('/commissions/{id}', [CommissionController::class, 'show']);
    $router->post('/commissions/{id}/approve', [CommissionController::class, 'approve']);
    $router->post('/commissions/{id}/pay', [CommissionController::class, 'pay']);
});
