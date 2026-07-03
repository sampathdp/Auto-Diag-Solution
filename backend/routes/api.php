<?php

declare(strict_types=1);

/** @var App\Core\Router\Router $router */

use App\Controllers\AuthController;
use App\Middleware\AuthMiddleware;
use App\Middleware\RoleMiddleware;
use App\Middleware\PermissionMiddleware;
use App\Middleware\TenantMiddleware;

// API v1 Routes
$v1 = '/api/v1';

// --- Static file serving (uploads proxied through API so nginx doesn't need /uploads/ config) ---
$router->get("$v1/storage/{type}/{file}", [App\Controllers\StorageController::class, 'serve']);

// --- Public Auth Routes ---
$router->post("$v1/auth/register", [AuthController::class, 'register']);
$router->post("$v1/auth/login", [AuthController::class, 'login']);
$router->post("$v1/auth/refresh", [AuthController::class, 'refresh']);
$router->get("$v1/public/packages", [App\Controllers\SubscriptionPlanController::class, 'index']);
$router->get("$v1/public/salons/{slug}", [App\Controllers\PublicSalonController::class, 'show']);
$router->get("$v1/public/salons/{slug}/lookup", [App\Controllers\PublicSalonController::class, 'lookupCustomer']);
$router->get("$v1/public/salons/{slug}/availability", [App\Controllers\PublicSalonController::class, 'getAvailability']);
$router->post("$v1/public/salons/{slug}/book", [App\Controllers\PublicSalonController::class, 'book']);
$router->post("$v1/contact/submit", [App\Controllers\ContactController::class, 'submit']);
$router->post("$v1/public/promo-codes/validate", [App\Controllers\PromoCodeController::class, 'validateCode']);

// --- Protected Auth Routes ---
$router->get("$v1/auth/me", [AuthController::class, 'me'], [AuthMiddleware::class, TenantMiddleware::class]);
$router->post("$v1/auth/change-password", [AuthController::class, 'changePassword'], [AuthMiddleware::class, TenantMiddleware::class]);
$router->post("$v1/auth/logout", [AuthController::class, 'logout'], [AuthMiddleware::class]);
$router->get("$v1/auth/2fa/status", [App\Controllers\TwoFactorController::class, 'status'], [AuthMiddleware::class]);
$router->post("$v1/auth/2fa/setup", [App\Controllers\TwoFactorController::class, 'setup'], [AuthMiddleware::class]);
$router->post("$v1/auth/2fa/confirm", [App\Controllers\TwoFactorController::class, 'confirm'], [AuthMiddleware::class]);
$router->post("$v1/auth/2fa/disable", [App\Controllers\TwoFactorController::class, 'disable'], [AuthMiddleware::class]);

// --- Tenant Protected Routes (Standard Flow) ---
// All these routes automatically filter data by the user's salon_id
$router->get("$v1/my-salon", [AuthController::class, 'me'], [
    AuthMiddleware::class,
    TenantMiddleware::class
]);

// --- Salon Management ---
$router->get("$v1/salons", [App\Controllers\SalonController::class, 'index'], [AuthMiddleware::class, TenantMiddleware::class]);
$router->post("$v1/salons", [App\Controllers\SalonController::class, 'store'], [AuthMiddleware::class, TenantMiddleware::class]);
$router->get("$v1/salons/{id}", [App\Controllers\SalonController::class, 'show'], [AuthMiddleware::class, TenantMiddleware::class]);
$router->put("$v1/salons/{id}", [App\Controllers\SalonController::class, 'update'], [AuthMiddleware::class, TenantMiddleware::class]);
$router->delete("$v1/salons/{id}", [App\Controllers\SalonController::class, 'destroy'], [AuthMiddleware::class, TenantMiddleware::class]);
$router->get("$v1/salons/{id}/users", [App\Controllers\SalonController::class, 'users'], [AuthMiddleware::class, TenantMiddleware::class, [PermissionMiddleware::class, 'admin.manage']]);
$router->post("$v1/admin/salons/{id}/reset-password", [App\Controllers\SalonController::class, 'resetPassword'], [AuthMiddleware::class, TenantMiddleware::class, [PermissionMiddleware::class, 'admin.manage']]);
$router->post("$v1/admin/salons/{id}/activate-trial", [App\Controllers\SalonController::class, 'activateTrial'], [AuthMiddleware::class, TenantMiddleware::class, [PermissionMiddleware::class, 'admin.manage']]);
$router->put("$v1/admin/salons/{id}", [App\Controllers\SalonController::class, 'update'], [AuthMiddleware::class, TenantMiddleware::class, [PermissionMiddleware::class, 'admin.manage']]);
$router->post("$v1/admin/salons/{id}/temp-access", [App\Controllers\SalonController::class, 'createTempAccess'], [AuthMiddleware::class, TenantMiddleware::class, [PermissionMiddleware::class, 'admin.manage']]);
$router->delete("$v1/admin/salons/{id}/temp-access", [App\Controllers\SalonController::class, 'revokeTempAccess'], [AuthMiddleware::class, TenantMiddleware::class, [PermissionMiddleware::class, 'admin.manage']]);
$router->post("$v1/admin/salons/{id}/set-start-date", [App\Controllers\SalonController::class, 'setStartDate'], [AuthMiddleware::class, TenantMiddleware::class, [PermissionMiddleware::class, 'admin.manage']]);
$router->put("$v1/admin/salons/{id}/plan", [App\Controllers\SalonController::class, 'changePlan'], [AuthMiddleware::class, TenantMiddleware::class, [PermissionMiddleware::class, 'admin.manage']]);
$router->get("$v1/admin/contact-messages", [App\Controllers\ContactController::class, 'index'], [AuthMiddleware::class, [PermissionMiddleware::class, 'admin.manage']]);
$router->get("$v1/admin/stats", [App\Controllers\AdminStatsController::class, 'index'], [AuthMiddleware::class, [PermissionMiddleware::class, 'admin.manage']]);

// --- User & Staff Management ---
$router->get("$v1/users", [App\Controllers\UserController::class, 'index'], [AuthMiddleware::class, App\Middleware\TenantMiddleware::class]);
$router->post("$v1/users", [App\Controllers\UserController::class, 'store'], [AuthMiddleware::class, App\Middleware\TenantMiddleware::class, [PermissionMiddleware::class, 'staff.manage']]);
$router->put("$v1/users/{id}", [App\Controllers\UserController::class, 'update'], [AuthMiddleware::class, App\Middleware\TenantMiddleware::class, [PermissionMiddleware::class, 'staff.manage']]);
$router->delete("$v1/users/{id}", [App\Controllers\UserController::class, 'destroy'], [AuthMiddleware::class, App\Middleware\TenantMiddleware::class, [PermissionMiddleware::class, 'staff.manage']]);

// --- Customer Management ---
$router->get("$v1/customers", [App\Controllers\CustomerController::class, 'index'], [AuthMiddleware::class, App\Middleware\TenantMiddleware::class]);
$router->post("$v1/customers", [App\Controllers\CustomerController::class, 'store'], [AuthMiddleware::class, App\Middleware\TenantMiddleware::class, [PermissionMiddleware::class, 'customers.view']]);
$router->put("$v1/customers/{id}", [App\Controllers\CustomerController::class, 'update'], [AuthMiddleware::class, App\Middleware\TenantMiddleware::class, [PermissionMiddleware::class, 'customers.view']]);
$router->delete("$v1/customers/{id}", [App\Controllers\CustomerController::class, 'destroy'], [AuthMiddleware::class, App\Middleware\TenantMiddleware::class, [PermissionMiddleware::class, 'customers.view']]);
$router->get("$v1/customers/{id}/appointments", [App\Controllers\CustomerController::class, 'appointments'], [AuthMiddleware::class, App\Middleware\TenantMiddleware::class]);

// --- Service Management ---
$router->get("$v1/services", [App\Controllers\ServiceController::class, 'index'], [AuthMiddleware::class, App\Middleware\TenantMiddleware::class]);
$router->post("$v1/services", [App\Controllers\ServiceController::class, 'store'], [AuthMiddleware::class, App\Middleware\TenantMiddleware::class, [PermissionMiddleware::class, 'services.manage']]);
$router->put("$v1/services/{id}", [App\Controllers\ServiceController::class, 'update'], [AuthMiddleware::class, App\Middleware\TenantMiddleware::class, [PermissionMiddleware::class, 'services.manage']]);
$router->delete("$v1/services/{id}", [App\Controllers\ServiceController::class, 'destroy'], [AuthMiddleware::class, App\Middleware\TenantMiddleware::class, [PermissionMiddleware::class, 'services.manage']]);

$router->get("$v1/service-categories", [App\Controllers\ServiceCategoryController::class, 'index'], [AuthMiddleware::class, App\Middleware\TenantMiddleware::class]);
$router->post("$v1/service-categories", [App\Controllers\ServiceCategoryController::class, 'store'], [AuthMiddleware::class, App\Middleware\TenantMiddleware::class, [PermissionMiddleware::class, 'services.manage']]);
$router->put("$v1/service-categories/{id}", [App\Controllers\ServiceCategoryController::class, 'update'], [AuthMiddleware::class, App\Middleware\TenantMiddleware::class, [PermissionMiddleware::class, 'services.manage']]);
$router->delete("$v1/service-categories/{id}", [App\Controllers\ServiceCategoryController::class, 'destroy'], [AuthMiddleware::class, App\Middleware\TenantMiddleware::class, [PermissionMiddleware::class, 'services.manage']]);

$router->get("$v1/appointments", [App\Controllers\AppointmentController::class, 'index'], [AuthMiddleware::class, App\Middleware\TenantMiddleware::class]);
$router->post("$v1/appointments", [App\Controllers\AppointmentController::class, 'store'], [AuthMiddleware::class, App\Middleware\TenantMiddleware::class, [PermissionMiddleware::class, 'appointments.view']]);
$router->put("$v1/appointments/{id}", [App\Controllers\AppointmentController::class, 'update'], [AuthMiddleware::class, App\Middleware\TenantMiddleware::class, [PermissionMiddleware::class, 'appointments.view']]);
$router->delete("$v1/appointments/{id}", [App\Controllers\AppointmentController::class, 'destroy'], [AuthMiddleware::class, App\Middleware\TenantMiddleware::class, [PermissionMiddleware::class, 'appointments.view']]);

// --- Dashboard ---
$router->get("$v1/dashboard/stats", [App\Controllers\DashboardController::class, 'index'], [AuthMiddleware::class, App\Middleware\TenantMiddleware::class]);

// --- Payments ---
$router->get("$v1/payment-settings", [App\Controllers\PaymentSettingsController::class, 'show'], [AuthMiddleware::class, App\Middleware\TenantMiddleware::class]);
$router->post("$v1/payment-settings", [App\Controllers\PaymentSettingsController::class, 'update'], [AuthMiddleware::class, App\Middleware\TenantMiddleware::class, [PermissionMiddleware::class, 'settings.manage']]);

$router->get("$v1/payment-proofs", [App\Controllers\PaymentProofController::class, 'index'], [AuthMiddleware::class, App\Middleware\TenantMiddleware::class]);
$router->get("$v1/payment-proofs/history", [App\Controllers\PaymentProofController::class, 'history'], [AuthMiddleware::class, App\Middleware\TenantMiddleware::class]);

// Reports
$router->get("$v1/reports/sales", [App\Controllers\ReportsController::class, 'sales'], [AuthMiddleware::class, TenantMiddleware::class]);
$router->get("$v1/reports/profit-loss", [App\Controllers\ReportsController::class, 'profitLoss'], [AuthMiddleware::class, TenantMiddleware::class]);
$router->get("$v1/reports/staff-performance", [App\Controllers\ReportsController::class, 'staffPerformance'], [AuthMiddleware::class, TenantMiddleware::class]);
$router->get("$v1/reports/service-analytics", [App\Controllers\ReportsController::class, 'serviceAnalytics'], [AuthMiddleware::class, TenantMiddleware::class]);

// Expenses
$router->get("$v1/expenses", [App\Controllers\ExpenseController::class, 'index'], [AuthMiddleware::class, TenantMiddleware::class]);
$router->post("$v1/expenses", [App\Controllers\ExpenseController::class, 'store'], [AuthMiddleware::class, TenantMiddleware::class, [PermissionMiddleware::class, 'billing.view']]);
$router->get("$v1/expenses/categories", [App\Controllers\ExpenseController::class, 'getCategories'], [AuthMiddleware::class, TenantMiddleware::class]);
$router->post("$v1/expenses/categories", [App\Controllers\ExpenseController::class, 'storeCategory'], [AuthMiddleware::class, TenantMiddleware::class, [PermissionMiddleware::class, 'billing.view']]);

$router->post("$v1/payment-proofs", [App\Controllers\PaymentProofController::class, 'store'], [AuthMiddleware::class, App\Middleware\TenantMiddleware::class]);
$router->post("$v1/payment-proofs/{id}/approve", [App\Controllers\PaymentProofController::class, 'approve'], [AuthMiddleware::class, App\Middleware\TenantMiddleware::class, [PermissionMiddleware::class, 'billing.manage']]);
$router->post("$v1/payment-proofs/{id}/reject", [App\Controllers\PaymentProofController::class, 'reject'], [AuthMiddleware::class, App\Middleware\TenantMiddleware::class, [PermissionMiddleware::class, 'billing.manage']]);

// --- Business Hours ---
$router->get("$v1/business-hours", [App\Controllers\BusinessHoursController::class, 'index'], [AuthMiddleware::class, App\Middleware\TenantMiddleware::class]);
$router->post("$v1/business-hours", [App\Controllers\BusinessHoursController::class, 'update'], [AuthMiddleware::class, App\Middleware\TenantMiddleware::class, [PermissionMiddleware::class, 'settings.manage']]);

// --- Staff Management ---
$router->get("$v1/staff", [App\Controllers\StaffController::class, 'index'], [AuthMiddleware::class, App\Middleware\TenantMiddleware::class]);
$router->post("$v1/staff", [App\Controllers\StaffController::class, 'store'], [AuthMiddleware::class, App\Middleware\TenantMiddleware::class, [PermissionMiddleware::class, 'staff.manage']]);
$router->put("$v1/staff/{id}", [App\Controllers\StaffController::class, 'update'], [AuthMiddleware::class, App\Middleware\TenantMiddleware::class, [PermissionMiddleware::class, 'staff.manage']]);
$router->delete("$v1/staff/{id}", [App\Controllers\StaffController::class, 'destroy'], [AuthMiddleware::class, App\Middleware\TenantMiddleware::class, [PermissionMiddleware::class, 'staff.manage']]);
$router->put("$v1/staff/{id}/password", [App\Controllers\StaffController::class, 'changePassword'], [AuthMiddleware::class, App\Middleware\TenantMiddleware::class, [PermissionMiddleware::class, 'staff.manage']]);
$router->get("$v1/staff/{id}/permissions", [App\Controllers\StaffController::class, 'getPermissions'], [AuthMiddleware::class, App\Middleware\TenantMiddleware::class, [PermissionMiddleware::class, 'staff.manage']]);
$router->put("$v1/staff/{id}/permissions", [App\Controllers\StaffController::class, 'setPermissions'], [AuthMiddleware::class, App\Middleware\TenantMiddleware::class, [PermissionMiddleware::class, 'staff.manage']]);
$router->get("$v1/staff/{id}/service-commissions", [App\Controllers\StaffController::class, 'getServiceCommissions'], [AuthMiddleware::class, App\Middleware\TenantMiddleware::class]);
$router->put("$v1/staff/{id}/service-commissions", [App\Controllers\StaffController::class, 'setServiceCommissions'], [AuthMiddleware::class, App\Middleware\TenantMiddleware::class, [PermissionMiddleware::class, 'staff.manage']]);

$router->get("$v1/billing/invoices", [App\Controllers\BillingController::class, 'index'], [AuthMiddleware::class, App\Middleware\TenantMiddleware::class]);
$router->post("$v1/billing/invoices", [App\Controllers\BillingController::class, 'store'], [AuthMiddleware::class, App\Middleware\TenantMiddleware::class, [PermissionMiddleware::class, 'billing.view']]);
$router->get("$v1/billing/invoices/{id}", [App\Controllers\BillingController::class, 'show'], [AuthMiddleware::class, App\Middleware\TenantMiddleware::class]);
$router->get("$v1/billing/appointment/{id}/status", [App\Controllers\BillingController::class, 'status'], [AuthMiddleware::class, App\Middleware\TenantMiddleware::class]);
$router->post("$v1/billing/pay", [App\Controllers\BillingController::class, 'pay'], [AuthMiddleware::class, App\Middleware\TenantMiddleware::class, [PermissionMiddleware::class, 'billing.view']]);

// --- Inventory Management ---
$router->get("$v1/inventory", [App\Controllers\InventoryController::class, 'index'], [AuthMiddleware::class, App\Middleware\TenantMiddleware::class]);
$router->post("$v1/inventory", [App\Controllers\InventoryController::class, 'store'], [AuthMiddleware::class, App\Middleware\TenantMiddleware::class, [PermissionMiddleware::class, 'inventory.view']]);
$router->put("$v1/inventory/{id}", [App\Controllers\InventoryController::class, 'update'], [AuthMiddleware::class, App\Middleware\TenantMiddleware::class, [PermissionMiddleware::class, 'inventory.view']]);
$router->delete("$v1/inventory/{id}", [App\Controllers\InventoryController::class, 'destroy'], [AuthMiddleware::class, App\Middleware\TenantMiddleware::class, [PermissionMiddleware::class, 'inventory.view']]);
$router->post("$v1/inventory/transaction", [App\Controllers\InventoryController::class, 'recordTransaction'], [AuthMiddleware::class, App\Middleware\TenantMiddleware::class, [PermissionMiddleware::class, 'inventory.view']]);
$router->get("$v1/inventory/logs", [App\Controllers\InventoryController::class, 'logs'], [AuthMiddleware::class, App\Middleware\TenantMiddleware::class]);

// --- SMS Marketing ---
$router->get("$v1/sms/clients-count", [App\Controllers\SmsMarketingController::class, 'clientsCount'], [AuthMiddleware::class, TenantMiddleware::class]);
$router->get("$v1/sms/clients", [App\Controllers\SmsMarketingController::class, 'clients'], [AuthMiddleware::class, TenantMiddleware::class]);
$router->post("$v1/sms/broadcast", [App\Controllers\SmsMarketingController::class, 'broadcast'], [AuthMiddleware::class, TenantMiddleware::class, [PermissionMiddleware::class, 'sms.manage']]);
$router->get("$v1/sms/broadcasts", [App\Controllers\SmsMarketingController::class, 'history'], [AuthMiddleware::class, TenantMiddleware::class]);

// --- Settings Management ---
$router->get("$v1/settings", [App\Controllers\SettingsController::class, 'index'], [AuthMiddleware::class, App\Middleware\TenantMiddleware::class]);
$router->post("$v1/settings", [App\Controllers\SettingsController::class, 'store'], [AuthMiddleware::class, App\Middleware\TenantMiddleware::class, [PermissionMiddleware::class, 'settings.manage']]);
$router->post("$v1/settings/upgrade", [App\Controllers\SettingsController::class, 'upgradeSubscription'], [AuthMiddleware::class, App\Middleware\TenantMiddleware::class, [PermissionMiddleware::class, 'admin.manage']]);
$router->post("$v1/settings/test-sms", [App\Controllers\SettingsController::class, 'testSms'], [AuthMiddleware::class, App\Middleware\TenantMiddleware::class, [PermissionMiddleware::class, 'settings.manage']]);

// --- Branch Management ---
$router->get("$v1/branches", [App\Controllers\BranchController::class, 'index'], [AuthMiddleware::class, App\Middleware\TenantMiddleware::class]);
$router->post("$v1/branches", [App\Controllers\BranchController::class, 'store'], [AuthMiddleware::class, App\Middleware\TenantMiddleware::class, [PermissionMiddleware::class, 'branches.manage']]);
$router->put("$v1/branches/{id}", [App\Controllers\BranchController::class, 'update'], [AuthMiddleware::class, App\Middleware\TenantMiddleware::class, [PermissionMiddleware::class, 'branches.manage']]);
$router->delete("$v1/branches/{id}", [App\Controllers\BranchController::class, 'destroy'], [AuthMiddleware::class, App\Middleware\TenantMiddleware::class, [PermissionMiddleware::class, 'branches.manage']]);

// --- Public Trial Registration ---
$router->post("$v1/trial/register", [App\Controllers\TrialRegistrationController::class, 'register']);
$router->post("$v1/trial/verify", [App\Controllers\TrialRegistrationController::class, 'verifyEmail']);
$router->post("$v1/trial/resend-otp", [App\Controllers\TrialRegistrationController::class, 'resendOtp']);

// --- Admin Trial Management ---
$router->get("$v1/admin/trial-requests", [App\Controllers\TrialRegistrationController::class, 'listPending'], [AuthMiddleware::class, TenantMiddleware::class, [PermissionMiddleware::class, 'admin.manage']]);
$router->post("$v1/admin/trial-requests/{id}/approve", [App\Controllers\TrialRegistrationController::class, 'approve'], [AuthMiddleware::class, TenantMiddleware::class, [PermissionMiddleware::class, 'admin.manage']]);
$router->post("$v1/admin/trial-requests/{id}/activate", [App\Controllers\TrialRegistrationController::class, 'activate'], [AuthMiddleware::class, TenantMiddleware::class, [PermissionMiddleware::class, 'admin.manage']]);
$router->post("$v1/admin/trial-requests/{id}/reject", [App\Controllers\TrialRegistrationController::class, 'reject'], [AuthMiddleware::class, TenantMiddleware::class, [PermissionMiddleware::class, 'admin.manage']]);
$router->post("$v1/admin/subscriptions/{salonId}/extend", [App\Controllers\TrialRegistrationController::class, 'extendTrial'], [AuthMiddleware::class, TenantMiddleware::class, [PermissionMiddleware::class, 'admin.manage']]);


// --- Admin Data Import ---
$router->get("$v1/admin/import/template", [App\Controllers\AdminImportController::class, 'template'], [AuthMiddleware::class, TenantMiddleware::class, [PermissionMiddleware::class, 'admin.manage']]);
$router->post("$v1/admin/salons/{id}/import/inventory", [App\Controllers\AdminImportController::class, 'importInventory'], [AuthMiddleware::class, TenantMiddleware::class, [PermissionMiddleware::class, 'admin.manage']]);
$router->post("$v1/admin/salons/{id}/import/categories", [App\Controllers\AdminImportController::class, 'importCategories'], [AuthMiddleware::class, TenantMiddleware::class, [PermissionMiddleware::class, 'admin.manage']]);
$router->post("$v1/admin/salons/{id}/import/services", [App\Controllers\AdminImportController::class, 'importServices'], [AuthMiddleware::class, TenantMiddleware::class, [PermissionMiddleware::class, 'admin.manage']]);

// --- Subscription Plan Management ---
$router->get("$v1/admin/packages", [App\Controllers\SubscriptionPlanController::class, 'index'], [AuthMiddleware::class, TenantMiddleware::class, [PermissionMiddleware::class, 'admin.manage']]);
$router->put("$v1/admin/packages/{id}", [App\Controllers\SubscriptionPlanController::class, 'update'], [AuthMiddleware::class, TenantMiddleware::class, [PermissionMiddleware::class, 'admin.manage']]);

// --- Promo Code Management ---
$router->get("$v1/admin/promo-codes", [App\Controllers\PromoCodeController::class, 'index'], [AuthMiddleware::class, TenantMiddleware::class, [PermissionMiddleware::class, 'admin.manage']]);
$router->post("$v1/admin/promo-codes", [App\Controllers\PromoCodeController::class, 'store'], [AuthMiddleware::class, TenantMiddleware::class, [PermissionMiddleware::class, 'admin.manage']]);
$router->put("$v1/admin/promo-codes/{id}", [App\Controllers\PromoCodeController::class, 'update'], [AuthMiddleware::class, TenantMiddleware::class, [PermissionMiddleware::class, 'admin.manage']]);
$router->delete("$v1/admin/promo-codes/{id}", [App\Controllers\PromoCodeController::class, 'destroy'], [AuthMiddleware::class, TenantMiddleware::class, [PermissionMiddleware::class, 'admin.manage']]);

// --- System Settings (admin-configurable: bank details, grace period, etc.) ---
$router->get("$v1/admin/system-settings", [App\Controllers\SystemSettingsController::class, 'index'], [AuthMiddleware::class, TenantMiddleware::class, [PermissionMiddleware::class, 'admin.manage']]);
$router->post("$v1/admin/system-settings", [App\Controllers\SystemSettingsController::class, 'update'], [AuthMiddleware::class, TenantMiddleware::class, [PermissionMiddleware::class, 'admin.manage']]);
// Authenticated salon owner can read bank details (needed for payment modals)
$router->get("$v1/system-settings/bank-details", [App\Controllers\SystemSettingsController::class, 'bankDetails'], [AuthMiddleware::class, TenantMiddleware::class]);

// --- Subscription Audit Log ---
$router->get("$v1/admin/subscriptions/{salonId}/audit-log", [App\Controllers\SubscriptionAuditController::class, 'index'], [AuthMiddleware::class, TenantMiddleware::class, [PermissionMiddleware::class, 'admin.manage']]);

// --- Salon Invoices (monthly billing) ---
$router->get("$v1/admin/invoices", [App\Controllers\InvoiceController::class, 'index'], [AuthMiddleware::class, TenantMiddleware::class, [PermissionMiddleware::class, 'admin.manage']]);
$router->post("$v1/admin/invoices/generate", [App\Controllers\InvoiceController::class, 'generate'], [AuthMiddleware::class, TenantMiddleware::class, [PermissionMiddleware::class, 'admin.manage']]);
$router->post("$v1/admin/invoices/send-all", [App\Controllers\InvoiceController::class, 'sendAll'], [AuthMiddleware::class, TenantMiddleware::class, [PermissionMiddleware::class, 'admin.manage']]);
$router->post("$v1/admin/invoices/{id}/send", [App\Controllers\InvoiceController::class, 'send'], [AuthMiddleware::class, TenantMiddleware::class, [PermissionMiddleware::class, 'admin.manage']]);

// --- Salon Subscription Payments ---
$router->post("$v1/payments/upload", [App\Controllers\PaymentController::class, 'uploadSlip'], [AuthMiddleware::class, TenantMiddleware::class]);
$router->get("$v1/payments/history", [App\Controllers\PaymentController::class, 'history'], [AuthMiddleware::class, TenantMiddleware::class]);

$router->get("$v1/admin/salon-payments", [App\Controllers\PaymentController::class, 'index'], [AuthMiddleware::class, TenantMiddleware::class, [PermissionMiddleware::class, 'admin.manage']]);
$router->post("$v1/admin/salon-payments/{id}/approve", [App\Controllers\PaymentController::class, 'approve'], [AuthMiddleware::class, TenantMiddleware::class, [PermissionMiddleware::class, 'admin.manage']]);
$router->post("$v1/admin/salon-payments/{id}/reject", [App\Controllers\PaymentController::class, 'reject'], [AuthMiddleware::class, TenantMiddleware::class, [PermissionMiddleware::class, 'admin.manage']]);

// --- Middleware Examples ---

// Only Salon Owners can access this
$router->get("$v1/admin/dashboard", function($request) {
    echo json_encode(['message' => 'Welcome, Salon Owner']);
}, [
    AuthMiddleware::class,
    [RoleMiddleware::class, ['salon_owner']]
]);
