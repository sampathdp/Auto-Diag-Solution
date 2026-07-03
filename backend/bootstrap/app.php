<?php

declare(strict_types=1);

use App\Core\Router\Router;

// Global configurations
date_default_timezone_set($_ENV['APP_TIMEZONE'] ?? 'Asia/Colombo');

// Initialize Router
$router = new Router();

// Load Routes
require_once __DIR__ . '/../routes/api.php';

return $router;
