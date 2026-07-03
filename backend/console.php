<?php

declare(strict_types=1);

// Load Manual Autoloader (No Composer)
require_once __DIR__ . '/bootstrap/manual_autoload.php';

$command = $argv[1] ?? null;

switch ($command) {
    case 'migrate':
        runMigrations();
        break;
    case 'migrate:rollback':
        rollbackMigrations();
        break;
    default:
        echo "Usage: php console.php [migrate|migrate:rollback]\n";
}

function runMigrations() {
    $files = glob(__DIR__ . '/database/migrations/*.php');
    foreach ($files as $file) {
        require_once $file;
        $className = getClassNameFromFile($file);
        $migration = new $className();
        echo "Migrating: $className...\n";
        $migration->up();
        echo "Migrated: $className\n";
    }
}

function rollbackMigrations() {
    $files = array_reverse(glob(__DIR__ . '/database/migrations/*.php'));
    foreach ($files as $file) {
        require_once $file;
        $className = getClassNameFromFile($file);
        $migration = new $className();
        echo "Rolling back: $className...\n";
        $migration->down();
        echo "Rolled back: $className\n";
    }
}

function getClassNameFromFile($file) {
    $name = basename($file, '.php');
    $parts = explode('_', $name);
    $cleanParts = array_slice($parts, 4);
    return implode('', array_map('ucfirst', $cleanParts));
}
