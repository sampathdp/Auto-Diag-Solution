<?php

declare(strict_types=1);

namespace App\Core\Database;

use PDO;
use PDOException;
use App\Core\Response;

class Database
{
    private static ?PDO $instance = null;

    public static function getInstance(): PDO
    {
        if (self::$instance === null) {
            try {
                $host = $_ENV['DB_HOST'] ?? '127.0.0.1';
                $port = $_ENV['DB_PORT'] ?? '3306';
                $db   = $_ENV['DB_DATABASE'] ?? 'salon_saas';
                $user = $_ENV['DB_USERNAME'] ?? 'root';
                $pass = $_ENV['DB_PASSWORD'] ?? '';

                $dsn = "mysql:host=$host;port=$port;dbname=$db;charset=utf8mb4";
                
                self::$instance = new PDO($dsn, $user, $pass, [
                    PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
                    PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
                    PDO::ATTR_EMULATE_PREPARES => false,
                ]);

                // Synchronize MySQL session time_zone with PHP default timezone
                $offset = (new \DateTime())->format('P');
                self::$instance->exec("SET time_zone = '{$offset}'");
            } catch (PDOException $e) {
                Response::error("Database connection failed: " . $e->getMessage(), null, 500);
            }
        }

        return self::$instance;
    }
}
