<?php

declare(strict_types=1);

namespace App\Core\Router;

use App\Core\Request;
use App\Core\Response;

class Router
{
    private array $routes = [];
    private array $middlewares = [];

    public function get(string $path, $callback, array $middlewares = []): void
    {
        $this->routes['GET'][$path] = [
            'callback' => $callback,
            'middlewares' => $middlewares
        ];
    }

    public function post(string $path, $callback, array $middlewares = []): void
    {
        $this->addRoute('POST', $path, $callback, $middlewares);
    }

    public function put(string $path, $callback, array $middlewares = []): void
    {
        $this->addRoute('PUT', $path, $callback, $middlewares);
    }

    public function delete(string $path, $callback, array $middlewares = []): void
    {
        $this->addRoute('DELETE', $path, $callback, $middlewares);
    }

    private function addRoute(string $method, string $path, $callback, array $middlewares): void
    {
        $this->routes[$method][$path] = [
            'callback' => $callback,
            'middlewares' => $middlewares
        ];
    }

    public function resolve(Request $request): void
    {
        $method = $request->getMethod();
        $path = $request->getUri();
        $route = null;
        $params = [];

        foreach ($this->routes[$method] ?? [] as $routePath => $config) {
            $pattern = preg_replace('/\{([a-zA-Z0-9_]+)\}/', '(?P<$1>[^/]+)', $routePath);
            $pattern = "#^" . $pattern . "$#";

            if (preg_match($pattern, $path, $matches)) {
                $route = $config;
                foreach ($matches as $key => $value) {
                    if (is_string($key)) $params[$key] = $value;
                }
                break;
            }
        }

        if (!$route) {
            Response::error("Route not found: $path", null, 404);
        }

        // Store params in request
        foreach ($params as $key => $value) {
            $request->setParam($key, $value);
        }

        $callback = $route['callback'];
        $middlewares = $route['middlewares'];

        // Execute Middlewares
        foreach ($middlewares as $mw) {
            if (is_array($mw)) {
                $middlewareClass = $mw[0];
                $args = array_slice($mw, 1);
                $middleware = new $middlewareClass(...$args);
            } else {
                $middleware = new $mw();
            }
            $middleware->handle($request);
        }

        // Execute Controller Method
        if (is_array($callback)) {
            [$controllerClass, $methodName] = $callback;
            $controller = new $controllerClass();
            $controller->$methodName($request);
        } elseif (is_callable($callback)) {
            $callback($request);
        }
    }
}
