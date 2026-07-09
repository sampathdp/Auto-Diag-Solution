<?php

declare(strict_types=1);

if (!function_exists('env')) {
    function env(string $key, $default = null) {
        return $_ENV[$key] ?? $default;
    }
}

if (!function_exists('dd')) {
    function dd(...$vars) {
        header('Content-Type: application/json');
        echo json_encode($vars, JSON_PRETTY_PRINT);
        die();
    }
}

if (!function_exists('sanitize')) {
    function sanitize(string $data): string {
        return htmlspecialchars(strip_tags(trim($data)));
    }
}

if (!function_exists('slugify')) {
    /**
     * ASCII-safe slug generation shared by every admin catalog entity
     * (categories, brands, products, ...). Bilingual names use name_en as the
     * slug source since Arabic doesn't transliterate meaningfully into a URL slug.
     */
    function slugify(string $text): string {
        $text = trim($text);
        // Transliterate accented Latin characters where possible.
        $transliterated = @iconv('UTF-8', 'ASCII//TRANSLIT', $text);
        if ($transliterated !== false) {
            $text = $transliterated;
        }
        $text = strtolower($text);
        $text = preg_replace('/[^a-z0-9]+/', '-', $text) ?? '';
        return trim($text, '-');
    }
}
