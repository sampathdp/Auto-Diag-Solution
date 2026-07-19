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
use App\Controllers\SeoMetaController;
use App\Controllers\SupplierController;
use App\Controllers\OrderController;
use App\Controllers\ReviewController;
use App\Controllers\DashboardController;
use App\Controllers\AccountController;
use App\Controllers\AccountAddressController;
use App\Controllers\AccountVehicleController;
use App\Controllers\AccountWishlistController;
use App\Controllers\AccountOrderController;
use App\Controllers\AccountNotificationController;
use App\Controllers\CheckoutController;
use App\Middleware\AuthMiddleware;
use App\Middleware\RoleMiddleware;

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

// --- Public storefront routes ---
$router->get("$v1/brands", [BrandController::class, 'active']);
$router->get("$v1/categories", [CategoryController::class, 'active']);
$router->get("$v1/vehicles/filters", [VehicleController::class, 'filters']);
// /products/{id} is registered after /products so a literal path never gets swallowed
// by the {id} wildcard (mirrors the /vehicles/filters-before-{id} ordering below).
$router->get("$v1/products", [ProductController::class, 'publicIndex']);
$router->get("$v1/products/{id}", [ProductController::class, 'publicShow']);
$router->get("$v1/pages/{slug}", [PageController::class, 'publicShow']);
$router->get("$v1/about-page", [AboutPageController::class, 'show']);

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
    $router->get('/orders/{id}', [AccountOrderController::class, 'show']);
    $router->post('/orders/{id}/cancel', [AccountOrderController::class, 'cancel']);
    $router->post('/orders/{id}/refund', [AccountOrderController::class, 'refund']);
    $router->post('/orders/{id}/reorder', [AccountOrderController::class, 'reorder']);

    $router->get('/notifications/preferences', [AccountNotificationController::class, 'show']);
    $router->put('/notifications/preferences', [AccountNotificationController::class, 'update']);

    // Mock checkout — creates a real order and auto-confirms payment via a 'mock'
    // provider until the client's real payment gateway is integrated.
    $router->post('/checkout', [CheckoutController::class, 'store']);
});

// --- Admin Routes ---
// Every route registered inside this group requires a valid JWT AND the 'admin' role —
// grouped so new admin-only endpoints (Phase 2+) can't accidentally skip the role check.
$router->group([
    'prefix' => "$v1/admin",
    'middleware' => [AuthMiddleware::class, [RoleMiddleware::class, ['admin']]],
], function ($router) {
    // --- User Management (admin only) ---
    $router->get('/users', [UserController::class, 'index']);
    $router->post('/users', [UserController::class, 'store']);
    $router->put('/users/{id}', [UserController::class, 'update']);
    $router->delete('/users/{id}', [UserController::class, 'destroy']);

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

    // --- Media library ---
    $router->get('/media', [MediaController::class, 'index']);
    $router->post('/media', [MediaController::class, 'store']);
    $router->put('/media/{id}', [MediaController::class, 'update']);
    $router->delete('/media/{id}', [MediaController::class, 'destroy']);

    // --- Products ---
    $router->get('/products', [ProductController::class, 'index']);
    $router->post('/products', [ProductController::class, 'store']);
    $router->get('/products/{id}', [ProductController::class, 'show']);
    $router->put('/products/{id}', [ProductController::class, 'update']);
    $router->delete('/products/{id}', [ProductController::class, 'destroy']);
    $router->put('/products/{id}/specifications', [ProductController::class, 'updateSpecifications']);
    $router->put('/products/{id}/vehicles', [ProductController::class, 'updateFitment']);

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
    $router->put('/orders/{id}/payment-status', [OrderController::class, 'updatePaymentStatus']);
    $router->post('/orders/{id}/notes', [OrderController::class, 'addNote']);

    // --- Review moderation ---
    $router->get('/reviews', [ReviewController::class, 'index']);
    $router->get('/reviews/{id}', [ReviewController::class, 'show']);
    $router->put('/reviews/{id}/approve', [ReviewController::class, 'approve']);
    $router->put('/reviews/{id}/reject', [ReviewController::class, 'reject']);
    $router->delete('/reviews/{id}', [ReviewController::class, 'destroy']);

    // --- Dashboard ---
    $router->get('/dashboard/stats', [DashboardController::class, 'stats']);
});
