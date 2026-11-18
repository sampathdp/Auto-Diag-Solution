<?php

declare(strict_types=1);

// Load Manual Autoloader (No Composer)
require_once __DIR__ . '/bootstrap/manual_autoload.php';

use App\Core\Database\DatabaseManager;

$command = $argv[1] ?? null;

switch ($command) {
    case 'migrate':
        runMigrations();
        break;
    case 'migrate:rollback':
        rollbackMigrations();
        break;
    case 'fulfillor:sync':
        syncFulfillorOrders();
        break;
    default:
        echo "Usage: php console.php [migrate|migrate:rollback|fulfillor:sync]\n";
}

// Polls Fulfillor for order status and warehouse stock (both read-only on Fulfillor's
// side). Fulfillor v1 has no webhooks, so this only runs "automatically" once it's on a
// schedule — add a cron entry (cPanel > Cron Jobs), e.g. every 5 minutes:
//   */5 * * * * php /path/to/backend/console.php fulfillor:sync >> /path/to/backend/scratch/fulfillor-sync.log 2>&1
// No-ops cleanly until FULFILLOR_BASE_URL/FULFILLOR_API_KEY are set in .env; the stock
// part also needs FULFILLOR_ORG_ID and FULFILLOR_FACILITY_ID.
function syncFulfillorOrders(): void
{
    $service = new \App\Services\Fulfillment\FulfillmentService();
    $result = $service->syncAllPending();
    echo "Fulfillor order sync: checked {$result['checked']} order(s), updated {$result['updated']}.\n";

    try {
        $stock = $service->syncInventory();
        $suffix = isset($stock['skipped']) ? " (skipped: {$stock['skipped']})" : '';
        echo "Fulfillor stock sync: checked {$stock['checked']} product(s), updated {$stock['updated']}{$suffix}.\n";
    } catch (\Throwable $e) {
        echo "Fulfillor stock sync failed: {$e->getMessage()}\n";
    }
}

function ensureMigrationsLedger(): void
{
    DatabaseManager::query("
        CREATE TABLE IF NOT EXISTS migrations (
            id         BIGINT PRIMARY KEY AUTO_INCREMENT,
            migration  VARCHAR(255) NOT NULL,
            batch      INT NOT NULL,
            run_at     TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            UNIQUE KEY uq_migrations_migration (migration)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    ");
}

function getRanMigrations(): array
{
    $rows = DatabaseManager::query("SELECT migration FROM migrations")->fetchAll(PDO::FETCH_COLUMN);
    return array_flip($rows);
}

function nextBatchNumber(): int
{
    $row = DatabaseManager::query("SELECT MAX(batch) AS b FROM migrations")->fetch();
    return ((int)($row['b'] ?? 0)) + 1;
}

// Runs only migrations not already recorded in the ledger — replaying an already-applied
// one-shot ALTER TABLE migration (e.g. a column that's already been dropped) would fail,
// which is exactly what happened before this ledger existed.
function runMigrations() {
    ensureMigrationsLedger();
    $ran = getRanMigrations();
    $batch = nextBatchNumber();

    $files = glob(__DIR__ . '/database/migrations/*.php');
    sort($files);

    $appliedAny = false;
    foreach ($files as $file) {
        $name = basename($file, '.php');
        if (isset($ran[$name])) {
            continue;
        }

        require_once $file;
        $className = getClassNameFromFile($file);
        $migration = new $className();
        echo "Migrating: $className...\n";
        $migration->up();
        DatabaseManager::query(
            "INSERT INTO migrations (migration, batch) VALUES (:migration, :batch)",
            ['migration' => $name, 'batch' => $batch]
        );
        echo "Migrated: $className\n";
        $appliedAny = true;
    }

    if (!$appliedAny) {
        echo "Nothing to migrate.\n";
    }
}

// Rolls back only the most recent batch (mirrors the standard migrate/rollback convention).
function rollbackMigrations() {
    ensureMigrationsLedger();
    $row = DatabaseManager::query("SELECT MAX(batch) AS b FROM migrations")->fetch();
    $lastBatch = (int)($row['b'] ?? 0);

    if ($lastBatch === 0) {
        echo "Nothing to roll back.\n";
        return;
    }

    $names = DatabaseManager::query(
        "SELECT migration FROM migrations WHERE batch = :batch ORDER BY id DESC",
        ['batch' => $lastBatch]
    )->fetchAll(PDO::FETCH_COLUMN);

    foreach ($names as $name) {
        $file = __DIR__ . "/database/migrations/$name.php";
        if (!file_exists($file)) {
            echo "Skipped (file missing on disk): $name\n";
            continue;
        }

        require_once $file;
        $className = getClassNameFromFile($file);
        $migration = new $className();
        echo "Rolling back: $className...\n";
        $migration->down();
        DatabaseManager::query("DELETE FROM migrations WHERE migration = :migration", ['migration' => $name]);
        echo "Rolled back: $className\n";
    }
}

function getClassNameFromFile($file) {
    $name = basename($file, '.php');
    $parts = explode('_', $name);
    $cleanParts = array_slice($parts, 4);
    return implode('', array_map('ucfirst', $cleanParts));
}
