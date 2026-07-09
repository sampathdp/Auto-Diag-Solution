<?php

declare(strict_types=1);

namespace App\Core;

class Arr
{
    /**
     * Casts the given keys to real PHP booleans, in a single row or a list of rows.
     *
     * MySQL TINYINT(1) columns (is_active, is_published, is_approved, ...) come back
     * from PDO as PHP int 0/1, which json_encode()s as the numbers 0/1 — not
     * true/false. Strict frontend validation (e.g. zod's z.boolean()) silently
     * rejects a 0/1, which blocks form submission with no visible error and no
     * network request (discovered via CategoryDrawerForm's edit flow: create worked
     * because it starts from a real `true` default, edit didn't because it resets
     * from this exact int-not-bool server value). Call this from every Service that
     * returns rows containing a boolean-shaped column.
     */
    public static function boolify(array $row, array $keys): array
    {
        foreach ($keys as $key) {
            if (array_key_exists($key, $row) && $row[$key] !== null) {
                $row[$key] = (bool) $row[$key];
            }
        }
        return $row;
    }

    /** @param array<int, array<string, mixed>> $rows */
    public static function boolifyMany(array $rows, array $keys): array
    {
        return array_map(fn(array $row) => self::boolify($row, $keys), $rows);
    }
}
