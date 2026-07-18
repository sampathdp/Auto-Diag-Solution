<?php

declare(strict_types=1);

namespace App\Services;

use App\Exceptions\DomainException;
use App\Repositories\AboutPageRepository;

/**
 * Backs the storefront About Us page (hero, story, values grid, milestones
 * timeline). The table is flat columns (see the 2026_07_18_000003 migration);
 * this service reshapes it into/from the nested {hero, story, values, timeline}
 * JSON the admin form and storefront actually work with.
 */
class AboutPageService
{
    private const VALUE_ITEM_FIELDS = ['icon', 'title_en', 'title_ar', 'body_en', 'body_ar'];
    private const MILESTONE_ITEM_FIELDS = ['year_en', 'year_ar', 'title_en', 'title_ar', 'body_en', 'body_ar'];

    private AboutPageRepository $repo;

    public function __construct()
    {
        $this->repo = new AboutPageRepository();
    }

    public function get(): array
    {
        $row = $this->repo->getSingleton();
        if (!$row) {
            throw new DomainException('About page content has not been seeded yet', 404);
        }
        return $this->toNested($row);
    }

    public function update(array $input): array
    {
        $row = $this->repo->getSingleton();
        if (!$row) {
            throw new DomainException('About page content has not been seeded yet', 404);
        }

        $data = [];

        $this->flattenSection($input, 'hero', [
            'eyebrow_en' => 'hero_eyebrow_en', 'eyebrow_ar' => 'hero_eyebrow_ar',
            'title_en' => 'hero_title_en', 'title_ar' => 'hero_title_ar',
            'subtitle_en' => 'hero_subtitle_en', 'subtitle_ar' => 'hero_subtitle_ar',
            'crumb_en' => 'hero_crumb_en', 'crumb_ar' => 'hero_crumb_ar',
        ], $data);

        $this->flattenSection($input, 'story', [
            'eyebrow_en' => 'story_eyebrow_en', 'eyebrow_ar' => 'story_eyebrow_ar',
            'title_en' => 'story_title_en', 'title_ar' => 'story_title_ar',
            'body1_en' => 'story_body1_en', 'body1_ar' => 'story_body1_ar',
            'body2_en' => 'story_body2_en', 'body2_ar' => 'story_body2_ar',
            'image_tag_en' => 'story_image_tag_en', 'image_tag_ar' => 'story_image_tag_ar',
            'image_url' => 'story_image_url',
        ], $data);

        $this->flattenSection($input, 'values', [
            'eyebrow_en' => 'values_eyebrow_en', 'eyebrow_ar' => 'values_eyebrow_ar',
            'title_en' => 'values_title_en', 'title_ar' => 'values_title_ar',
        ], $data);
        if (isset($input['values']['items'])) {
            $data['values_json'] = $this->encodeItems($input['values']['items'], self::VALUE_ITEM_FIELDS, 'values');
        }

        $this->flattenSection($input, 'timeline', [
            'eyebrow_en' => 'timeline_eyebrow_en', 'eyebrow_ar' => 'timeline_eyebrow_ar',
            'title_en' => 'timeline_title_en', 'title_ar' => 'timeline_title_ar',
        ], $data);
        if (isset($input['timeline']['items'])) {
            $data['milestones_json'] = $this->encodeItems($input['timeline']['items'], self::MILESTONE_ITEM_FIELDS, 'timeline');
        }

        if (!empty($data)) {
            $this->repo->update((int)$row['id'], $data);
        }

        return $this->get();
    }

    private function flattenSection(array $input, string $section, array $keyToColumn, array &$data): void
    {
        if (!isset($input[$section]) || !is_array($input[$section])) {
            return;
        }
        foreach ($keyToColumn as $key => $column) {
            if (array_key_exists($key, $input[$section])) {
                $data[$column] = (string)$input[$section][$key];
            }
        }
    }

    private function encodeItems(mixed $items, array $requiredFields, string $section): string
    {
        if (!is_array($items) || $items === []) {
            throw new DomainException("{$section}.items must be a non-empty array", 422);
        }

        $clean = [];
        foreach ($items as $item) {
            if (!is_array($item)) {
                throw new DomainException("{$section}.items entries must be objects", 422);
            }
            $entry = [];
            foreach ($requiredFields as $field) {
                $entry[$field] = (string)($item[$field] ?? '');
            }
            $clean[] = $entry;
        }

        return json_encode($clean, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    }

    private function toNested(array $row): array
    {
        return [
            'hero' => [
                'eyebrow_en' => $row['hero_eyebrow_en'], 'eyebrow_ar' => $row['hero_eyebrow_ar'],
                'title_en' => $row['hero_title_en'], 'title_ar' => $row['hero_title_ar'],
                'subtitle_en' => $row['hero_subtitle_en'], 'subtitle_ar' => $row['hero_subtitle_ar'],
                'crumb_en' => $row['hero_crumb_en'], 'crumb_ar' => $row['hero_crumb_ar'],
            ],
            'story' => [
                'eyebrow_en' => $row['story_eyebrow_en'], 'eyebrow_ar' => $row['story_eyebrow_ar'],
                'title_en' => $row['story_title_en'], 'title_ar' => $row['story_title_ar'],
                'body1_en' => $row['story_body1_en'], 'body1_ar' => $row['story_body1_ar'],
                'body2_en' => $row['story_body2_en'], 'body2_ar' => $row['story_body2_ar'],
                'image_tag_en' => $row['story_image_tag_en'], 'image_tag_ar' => $row['story_image_tag_ar'],
                'image_url' => $row['story_image_url'],
            ],
            'values' => [
                'eyebrow_en' => $row['values_eyebrow_en'], 'eyebrow_ar' => $row['values_eyebrow_ar'],
                'title_en' => $row['values_title_en'], 'title_ar' => $row['values_title_ar'],
                'items' => json_decode((string)$row['values_json'], true) ?? [],
            ],
            'timeline' => [
                'eyebrow_en' => $row['timeline_eyebrow_en'], 'eyebrow_ar' => $row['timeline_eyebrow_ar'],
                'title_en' => $row['timeline_title_en'], 'title_ar' => $row['timeline_title_ar'],
                'items' => json_decode((string)$row['milestones_json'], true) ?? [],
            ],
            'updated_at' => $row['updated_at'],
        ];
    }
}
