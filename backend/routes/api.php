<?php

declare(strict_types=1);

/** @var App\Core\Router\Router $router */

use App\Controllers\AuthController;
use App\Middleware\AuthMiddleware;

// API v1 Routes
$v1 = '/api/v1';

// --- Static file serving (uploads proxied through API so nginx doesn't need /uploads/ config) ---
$router->get("$v1/storage/{type}/{file}", [App\Controllers\StorageController::class, 'serve']);

// --- Public Auth Routes ---
$router->post("$v1/auth/register", [AuthController::class, 'register']);
$router->post("$v1/auth/login", [AuthController::class, 'login']);
$router->post("$v1/auth/refresh", [AuthController::class, 'refresh']);

// --- Protected Auth Routes ---
$router->get("$v1/auth/me", [AuthController::class, 'me'], [AuthMiddleware::class]);
$router->post("$v1/auth/change-password", [AuthController::class, 'changePassword'], [AuthMiddleware::class]);
$router->post("$v1/auth/logout", [AuthController::class, 'logout'], [AuthMiddleware::class]);
$router->get("$v1/auth/2fa/status", [App\Controllers\TwoFactorController::class, 'status'], [AuthMiddleware::class]);
$router->post("$v1/auth/2fa/setup", [App\Controllers\TwoFactorController::class, 'setup'], [AuthMiddleware::class]);
$router->post("$v1/auth/2fa/confirm", [App\Controllers\TwoFactorController::class, 'confirm'], [AuthMiddleware::class]);
$router->post("$v1/auth/2fa/disable", [App\Controllers\TwoFactorController::class, 'disable'], [AuthMiddleware::class]);

// --- User Management ---
$router->get("$v1/users", [App\Controllers\UserController::class, 'index'], [AuthMiddleware::class]);
$router->post("$v1/users", [App\Controllers\UserController::class, 'store'], [AuthMiddleware::class]);
$router->put("$v1/users/{id}", [App\Controllers\UserController::class, 'update'], [AuthMiddleware::class]);
$router->delete("$v1/users/{id}", [App\Controllers\UserController::class, 'destroy'], [AuthMiddleware::class]);
