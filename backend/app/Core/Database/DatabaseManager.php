<?php

declare(strict_types=1);

namespace App\Core\Database;

use PDO;
use PDOException;
use Exception;
use App\Core\Response;

class DatabaseManager
{
    private static ?PDO $connection = null;
    private static array $queryLog = [];

    public static function connect(): PDO
    {
        if (self::$connection !== null) {
            return self::$connection;
        }

        try {
            $config = [
                'host' => $_ENV['DB_HOST'] ?? '127.0.0.1',
                'port' => $_ENV['DB_PORT'] ?? '3306',
                'dbname' => $_ENV['DB_DATABASE'] ?? 'salon_saas',
                'user' => $_ENV['DB_USERNAME'] ?? 'root',
                'pass' => $_ENV['DB_PASSWORD'] ?? '',
            ];

            $dsn = "mysql:host={$config['host']};port={$config['port']};dbname={$config['dbname']};charset=utf8mb4";
            
            self::$connection = new PDO($dsn, $config['user'], $config['pass'], [
                PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
                PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
                PDO::ATTR_EMULATE_PREPARES => false,
                1002 => "SET NAMES utf8mb4 COLLATE utf8mb4_unicode_ci"
            ]);

            // Synchronize MySQL session time_zone with PHP default timezone
            $offset = (new \DateTime())->format('P');
            self::$connection->exec("SET time_zone = '{$offset}'");

            return self::$connection;
        } catch (PDOException $e) {
            throw new Exception("Database Connection Error: " . $e->getMessage());
        }
    }

    public static function query(string $sql, array $params = []): \PDOStatement
    {
        $start = microtime(true);
        $stmt = self::connect()->prepare($sql);
        $stmt->execute($params);
        
        self::$queryLog[] = [
            'sql' => $sql,
            'params' => $params,
            'time' => microtime(true) - $start
        ];

        return $stmt;
    }

    public static function beginTransaction(): bool
    {
        return self::connect()->beginTransaction();
    }

    public static function commit(): bool
    {
        return self::connect()->commit();
    }

    public static function rollBack(): bool
    {
        return self::connect()->rollBack();
    }

    public static function getLastInsertId(): string|false
    {
        return self::connect()->lastInsertId();
    }

    public static function getQueryLog(): array
    {
        return self::$queryLog;
    }
}
