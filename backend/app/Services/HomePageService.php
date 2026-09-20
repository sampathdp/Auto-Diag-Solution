<?php

declare(strict_types=1);

namespace App\Services;

use App\Exceptions\DomainException;
use App\Repositories\HomePageRepository;

/**
 * Backs the storefront home page copy. Content is one JSON document:
 *   { <section>: { <field>_en, <field>_ar, ... }, stats|why: { items: [...] } }
 * Only whitelisted sections/fields are persisted; everything else in the payload
 * is dropped.
 */
class HomePageService
{
    // Bilingual text fields (stored as <name>_en / <name>_ar) per section.
    private const SECTIONS = [
        'hero' => ['eyebrow', 'title_line1', 'title_line2', 'title_highlight', 'subtitle', 'credential1', 'credential2', 'credential3', 'cta_shop', 'cta_finder'],
        'about' => ['eyebrow', 'title', 'body', 'link', 'image_tag'],
        'categories' => ['eyebrow', 'title'],
        'products' => ['eyebrow', 'title'],
        'brands' => ['eyebrow', 'title', 'description', 'link'],
        'why' => ['eyebrow', 'title'],
        'cta' => ['title', 'button'],
    ];

    // Language-neutral scalar fields per section.
    private const PLAIN = [
        'about' => ['image_url'],
        'cta' => ['whatsapp_number'],
    ];

    // Repeating item lists.
    private const ITEMS = [
        'stats' => ['count' => 4, 'bilingual' => ['value', 'label'], 'plain' => []],
        'why' => ['count' => 4, 'bilingual' => ['title', 'body'], 'plain' => ['icon']],
    ];

    private HomePageRepository $repo;

    public function __construct()
    {
        $this->repo = new HomePageRepository();
    }

    public function get(): array
    {
        $row = $this->repo->getSingleton();
        if (!$row) {
            throw new DomainException('Home page content has not been seeded yet', 404);
        }

        $content = json_decode((string)$row['content_json'], true) ?: [];
        $content['updated_at'] = $row['updated_at'];
        return $content;
    }

    public function update(array $input): array
    {
        $row = $this->repo->getSingleton();
        if (!$row) {
            throw new DomainException('Home page content has not been seeded yet', 404);
        }

        $current = json_decode((string)$row['content_json'], true) ?: [];

        foreach (self::SECTIONS as $section => $fields) {
            if (!isset($input[$section]) || !is_array($input[$section])) {
                continue;
            }
            foreach ($fields as $field) {
                foreach (['en', 'ar'] as $lang) {
                    $key = "{$field}_{$lang}";
                    if (array_key_exists($key, $input[$section])) {
                        $current[$section][$key] = trim((string)$input[$section][$key]);
                    }
                }
            }
        }

        foreach (self::PLAIN as $section => $fields) {
            foreach ($fields as $field) {
                if (isset($input[$section]) && is_array($input[$section]) && array_key_exists($field, $input[$section])) {
                    $current[$section][$field] = trim((string)$input[$section][$field]);
                }
            }
        }

        foreach (self::ITEMS as $section => $spec) {
            if (isset($input[$section]['items'])) {
                $current[$section]['items'] = $this->cleanItems($input[$section]['items'], $spec, $section);
            }
        }

        $this->repo->update((int)$row['id'], [
            'content_json' => json_encode($current, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES),
        ]);

        return $this->get();
    }

    private function cleanItems(mixed $items, array $spec, string $section): array
    {
        if (!is_array($items) || count($items) !== $spec['count']) {
            throw new DomainException("{$section}.items must contain exactly {$spec['count']} entries", 422);
        }

        $clean = [];
        foreach (array_values($items) as $item) {
            if (!is_array($item)) {
                throw new DomainException("{$section}.items entries must be objects", 422);
            }
            $entry = [];
            foreach ($spec['bilingual'] as $field) {
                foreach (['en', 'ar'] as $lang) {
                    $entry["{$field}_{$lang}"] = trim((string)($item["{$field}_{$lang}"] ?? ''));
                }
            }
            foreach ($spec['plain'] as $field) {
                $entry[$field] = trim((string)($item[$field] ?? ''));
            }
            $clean[] = $entry;
        }
        return $clean;
    }
}
