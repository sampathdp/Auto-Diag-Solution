<?php

declare(strict_types=1);

namespace App\Services;

use App\Core\Arr;
use App\Core\Database\DatabaseManager;
use App\Exceptions\DomainException;
use App\Repositories\MediaRepository;
use App\Repositories\ProductRepository;

class ProductService
{
    private const VALID_STATUS = ['draft', 'active', 'inactive'];
    private const VALID_STOCK_STATUS = ['in_stock', 'out_of_stock', 'backorder'];
    private const VALID_SOURCE = ['local', '3pl'];
    private const VALID_PART_TYPE = ['genuine', 'aftermarket', 'oem'];
    private const BOOLEAN_FIELDS = ['vat_inclusive', 'track_inventory', 'fits_all_vehicles', 'free_shipping'];
    private const MIN_FITMENT_YEAR = 1980;

    private ProductRepository $repo;
    private MediaRepository $mediaRepo;

    public function __construct()
    {
        $this->repo = new ProductRepository();
        $this->mediaRepo = new MediaRepository();
    }

    /**
     * Public storefront listing — active products only, shaped down to what a shopper
     * needs (no cost_price/supplier/source internals). Mirrors list() but calls the
     * repo's public* methods, resolves `images` (media ids) to real URLs, and attaches
     * fitment as year/make/model triplets instead of raw vehicle ids.
     */
    public function publicList(array $filters, string $search, string $sort, int $page, int $perPage): array
    {
        $items = $this->repo->publicPaginate($filters, $search, $sort, $page, $perPage);
        $fitmentByProduct = $this->repo->fitmentRowsForProducts(array_column($items, 'id'));

        $shaped = array_map(function (array $row) use ($fitmentByProduct) {
            return $this->shapePublic($row, $fitmentByProduct[(int)$row['id']] ?? []);
        }, $items);

        return [
            'items' => $shaped,
            'total' => $this->repo->publicCountFiltered($filters, $search),
        ];
    }

    public function publicFind(int $id): array
    {
        $product = $this->repo->findActiveById($id);
        if (!$product) {
            throw new DomainException('Product not found', 404);
        }
        $fitment = $this->repo->fitmentRowsForProducts([$id])[$id] ?? [];
        $shaped = $this->shapePublic($product, $fitment);
        $shaped['specifications'] = $this->repo->specifications($id);
        // Needed by the product page's SEO metadata/schema (MPN, OG last-modified) —
        // not used by the product grid, so publicList()/shapePublic() callers there skip it.
        $shaped['cross_reference_numbers'] = $this->repo->crossReferences($id);
        return $shaped;
    }

    /**
     * Storefront-safe shape: drops cost_price/source/supplier_id/track_inventory
     * internals, resolves `images` (media ids) to public URLs, and renames
     * price/stock to the field names the storefront UI already expects.
     */
    private function shapePublic(array $row, array $fitment): array
    {
        $images = json_decode((string)($row['images'] ?? '[]'), true) ?? [];
        $paths = $this->mediaRepo->pathsForIds($images);
        $baseUrl = rtrim($_ENV['APP_URL'] ?? 'http://localhost:8000', '/');
        $imageUrls = array_values(array_filter(array_map(
            function ($id) use ($paths, $baseUrl) {
                $path = $paths[$id] ?? null;
                if ($path === null) {
                    return null;
                }
                // Media rows can point at an external URL instead of a locally uploaded
                // file — pass those through as-is rather than mangling them into
                // "{baseUrl}https://...".
                if (str_starts_with($path, 'http://') || str_starts_with($path, 'https://')) {
                    return $path;
                }
                // Local uploads live under public/uploads/{type}/{file} and are served
                // through StorageController (not linked to directly) — the webroot on
                // shared hosting is the project root, not public/, so a raw "{baseUrl}
                // {path}" URL 404s there even though it happens to work against the PHP
                // built-in dev server (which serves public/ itself as the webroot).
                return str_starts_with($path, '/uploads/')
                    ? $baseUrl . '/api/v1/storage' . substr($path, strlen('/uploads'))
                    : $baseUrl . $path;
            },
            $images
        )));

        return [
            'id' => (int)$row['id'],
            'sku' => $row['sku'],
            'slug' => $row['slug'],
            'name_en' => $row['name_en'],
            'name_ar' => $row['name_ar'],
            'short_description_en' => $row['short_description_en'],
            'short_description_ar' => $row['short_description_ar'],
            'description_en' => $row['description_en'],
            'description_ar' => $row['description_ar'],
            'brand' => $row['brand_name_en'] ? [
                'name_en' => $row['brand_name_en'],
                'name_ar' => $row['brand_name_ar'],
                'slug' => $row['brand_slug'],
            ] : null,
            'category' => $row['category_name_en'] ? [
                'name_en' => $row['category_name_en'],
                'name_ar' => $row['category_name_ar'],
                'slug' => $row['category_slug'],
            ] : null,
            'part_type' => $row['part_type'] ?? null,
            'oem_part_number' => $row['oem_part_number'] ?? null,
            'material' => $row['material'] ?? null,
            'country_of_origin' => $row['country_of_origin'] ?? null,
            'price_aed' => (float)$row['price'],
            'compare_at_price' => $row['compare_at_price'] !== null ? (float)$row['compare_at_price'] : null,
            'vat_inclusive' => (bool)$row['vat_inclusive'],
            'images' => $imageUrls,
            'stock' => (int)$row['stock_quantity'],
            'stock_status' => $row['stock_status'],
            'fits_all_vehicles' => (bool)$row['fits_all_vehicles'],
            'free_shipping' => (bool)$row['free_shipping'],
            'compatible_vehicles' => array_map(fn (array $f) => [
                'make' => $f['make'],
                'model' => $f['model'],
                'chassis_code' => $f['chassis_code'] ?? null,
                'year_from' => (int)$f['year_from'],
                'year_to' => (int)$f['year_to'],
                'vin_note' => $f['vin_note'],
            ], $fitment),
            'rating' => round((float)$row['rating'], 1),
            'reviews' => (int)$row['review_count'],
            'updated_at' => $row['updated_at'] ?? null,
        ];
    }

    public function list(array $filters, string $search, string $sortBy, string $sortDir, int $page, int $perPage): array
    {
        $items = $this->repo->paginate($filters, $search, $sortBy, $sortDir, $page, $perPage);
        $fitmentsByProduct = $this->repo->fitmentRowsForProducts(array_column($items, 'id'));

        $crossRefsByProduct = $this->repo->crossReferencesForProducts(array_column($items, 'id'));

        $shaped = array_map(function (array $row) use ($fitmentsByProduct, $crossRefsByProduct) {
            $row = $this->shape($row);
            $row['fitments'] = $fitmentsByProduct[(int)$row['id']] ?? [];
            $row['cross_reference_numbers'] = $crossRefsByProduct[(int)$row['id']] ?? [];
            return $row;
        }, $items);

        return [
            'items' => $shaped,
            'total' => $this->repo->countFiltered($filters, $search),
        ];
    }

    public function find(int $id): array
    {
        $product = $this->repo->find($id);
        if (!$product) {
            throw new DomainException('Product not found', 404);
        }
        $product = $this->shape($product);
        $product['specifications'] = $this->repo->specifications($id);
        $product['fitments'] = $this->repo->fitmentRowsForProduct($id);
        $product['cross_reference_numbers'] = $this->repo->crossReferences($id);
        return $product;
    }

    /**
     * Two response-shape fixes applied to every row this service returns:
     * - `images` is stored as a JSON-encoded string (json_encode() in validate()
     *   below); PDO never decodes MySQL JSON columns back into a PHP array on read,
     *   so without this it round-trips to the client as a literal string like "[1,2]"
     *   instead of an actual array.
     * - vat_inclusive/track_inventory/fits_all_vehicles are TINYINT(1) — see
     *   Arr::boolify()'s doc comment for why that needs casting too.
     */
    private function shape(array $row): array
    {
        $row = Arr::boolify($row, self::BOOLEAN_FIELDS);
        if (array_key_exists('images', $row)) {
            $row['images'] = json_decode((string)($row['images'] ?? '[]'), true) ?? [];
        }
        return $row;
    }

    public function create(array $input): array
    {
        $data = $this->validate($input, null);
        $specs = $this->validateSpecifications($input['specifications'] ?? null);
        $fitments = $this->validateFitments($input['fitments'] ?? null);
        $crossRefs = $this->validateCrossReferences($input['cross_reference_numbers'] ?? null);

        DatabaseManager::beginTransaction();
        try {
            $id = $this->repo->create($data);
            if ($specs !== null) {
                $this->repo->replaceSpecifications($id, $specs);
            }
            if ($fitments !== null && empty($data['fits_all_vehicles'])) {
                $this->repo->replaceFitments($id, $fitments);
            }
            if ($crossRefs !== null) {
                $this->repo->replaceCrossReferences($id, $crossRefs);
            }
            DatabaseManager::commit();
        } catch (\Throwable $e) {
            DatabaseManager::rollBack();
            throw $e;
        }

        return $this->find($id);
    }

    public function update(int $id, array $input): array
    {
        if (!$this->repo->find($id)) {
            throw new DomainException('Product not found', 404);
        }

        $data = $this->validate($input, $id);
        $specs = $this->validateSpecifications($input['specifications'] ?? null);
        $fitments = $this->validateFitments($input['fitments'] ?? null);
        $crossRefs = $this->validateCrossReferences($input['cross_reference_numbers'] ?? null);

        DatabaseManager::beginTransaction();
        try {
            if (!empty($data)) {
                $this->repo->update($id, $data);
            }
            if ($specs !== null) {
                $this->repo->replaceSpecifications($id, $specs);
            }
            if ($fitments !== null) {
                $fitsAll = array_key_exists('fits_all_vehicles', $data)
                    ? (bool)$data['fits_all_vehicles']
                    : (bool)$this->repo->find($id)['fits_all_vehicles'];
                if (!$fitsAll) {
                    $this->repo->replaceFitments($id, $fitments);
                }
            }
            if ($crossRefs !== null) {
                $this->repo->replaceCrossReferences($id, $crossRefs);
            }
            DatabaseManager::commit();
        } catch (\Throwable $e) {
            DatabaseManager::rollBack();
            throw $e;
        }

        return $this->find($id);
    }

    /** Dedicated endpoint for an admin UI's "Specifications" tab, independent of the main product form. */
    public function updateSpecifications(int $id, mixed $rawSpecs): array
    {
        if (!$this->repo->find($id)) {
            throw new DomainException('Product not found', 404);
        }
        $specs = $this->validateSpecifications($rawSpecs) ?? [];
        $this->repo->replaceSpecifications($id, $specs);
        return $this->find($id);
    }

    /** Dedicated endpoint for an admin UI's "Fitment" tab, independent of the main product form. */
    public function updateFitment(int $id, mixed $rawFitments): array
    {
        $product = $this->repo->find($id);
        if (!$product) {
            throw new DomainException('Product not found', 404);
        }
        if ((bool)$product['fits_all_vehicles']) {
            throw new DomainException(
                'This product is marked as fitting all vehicles — clear that flag before assigning specific fitment',
                422
            );
        }
        $fitments = $this->validateFitments($rawFitments) ?? [];
        $this->repo->replaceFitments($id, $fitments);
        return $this->find($id);
    }

    public function delete(int $id): void
    {
        if (!$this->repo->find($id)) {
            throw new DomainException('Product not found', 404);
        }
        // product_specifications/product_fitments/product_cross_references/cart_items/
        // wishlists CASCADE; order_items SET NULL (order history keeps its sku/name/price
        // snapshot) — schema already
        // handles cleanup, no extra guard needed here.
        $this->repo->delete($id);
    }

    private function validate(array $input, ?int $excludeId): array
    {
        $data = [];
        $isCreate = $excludeId === null;

        if ($isCreate || array_key_exists('name_en', $input)) {
            $nameEn = trim((string)($input['name_en'] ?? ''));
            if ($nameEn === '') {
                throw new DomainException('English name is required', 422);
            }
            $data['name_en'] = $nameEn;
        }

        if ($isCreate || array_key_exists('name_ar', $input)) {
            $nameAr = trim((string)($input['name_ar'] ?? ''));
            if ($nameAr === '') {
                throw new DomainException('Arabic name is required', 422);
            }
            $data['name_ar'] = $nameAr;
        }

        if ($isCreate || array_key_exists('sku', $input)) {
            $sku = trim((string)($input['sku'] ?? ''));
            if ($sku === '') {
                throw new DomainException('SKU is required', 422);
            }
            $conflict = $excludeId !== null
                ? $this->repo->existsExcluding('sku', $sku, $excludeId)
                : (bool) $this->repo->findBy('sku', $sku);
            if ($conflict) {
                throw new DomainException('A product with this SKU already exists', 409);
            }
            $data['sku'] = $sku;
        }

        foreach (['description_en', 'description_ar', 'short_description_en', 'short_description_ar'] as $field) {
            if (array_key_exists($field, $input)) {
                $data[$field] = $input[$field] !== null ? (string)$input[$field] : null;
            }
        }

        if (array_key_exists('price', $input)) {
            $price = (float)$input['price'];
            if ($price < 0) {
                throw new DomainException('Price cannot be negative', 422);
            }
            $data['price'] = $price;
        } elseif ($isCreate) {
            throw new DomainException('Price is required', 422);
        }

        foreach (['compare_at_price', 'cost_price', 'weight_kg'] as $field) {
            if (array_key_exists($field, $input)) {
                $data[$field] = $input[$field] !== null && $input[$field] !== '' ? (float)$input[$field] : null;
            }
        }

        if (array_key_exists('stock_quantity', $input)) {
            $qty = (int)$input['stock_quantity'];
            if ($qty < 0) {
                throw new DomainException('Stock quantity cannot be negative', 422);
            }
            $data['stock_quantity'] = $qty;
        }

        if (array_key_exists('low_stock_threshold', $input)) {
            $data['low_stock_threshold'] = $input['low_stock_threshold'] !== null && $input['low_stock_threshold'] !== ''
                ? (int)$input['low_stock_threshold']
                : null;
        }

        if (array_key_exists('stock_status', $input)) {
            if (!in_array($input['stock_status'], self::VALID_STOCK_STATUS, true)) {
                throw new DomainException('Invalid stock status', 422);
            }
            $data['stock_status'] = $input['stock_status'];
        }

        if (array_key_exists('status', $input)) {
            if (!in_array($input['status'], self::VALID_STATUS, true)) {
                throw new DomainException('Invalid product status', 422);
            }
            $data['status'] = $input['status'];
        } elseif ($isCreate) {
            $data['status'] = 'draft';
        }

        if (array_key_exists('source', $input)) {
            if (!in_array($input['source'], self::VALID_SOURCE, true)) {
                throw new DomainException('Invalid source', 422);
            }
            $data['source'] = $input['source'];
        }

        foreach (['vat_inclusive', 'track_inventory', 'fits_all_vehicles', 'free_shipping'] as $field) {
            if (array_key_exists($field, $input)) {
                $data[$field] = (int)(bool)$input[$field];
            }
        }

        if (array_key_exists('part_type', $input)) {
            $partType = $input['part_type'];
            if ($partType === null || $partType === '') {
                $data['part_type'] = null;
            } elseif (!in_array($partType, self::VALID_PART_TYPE, true)) {
                throw new DomainException('Invalid part type', 422);
            } else {
                $data['part_type'] = $partType;
            }
        }

        foreach (['oem_part_number', 'material', 'country_of_origin', 'fulfillor_product_id'] as $field) {
            if (array_key_exists($field, $input)) {
                $trimmed = trim((string)($input[$field] ?? ''));
                $data[$field] = $trimmed !== '' ? $trimmed : null;
            }
        }

        if (array_key_exists('category_id', $input)) {
            $data['category_id'] = $this->resolveForeignKey($input['category_id'], 'categories', 'Category');
        }
        if (array_key_exists('brand_id', $input)) {
            $data['brand_id'] = $this->resolveForeignKey($input['brand_id'], 'brands', 'Brand');
        }
        if (array_key_exists('supplier_id', $input)) {
            $data['supplier_id'] = $this->resolveForeignKey($input['supplier_id'], 'suppliers', 'Supplier');
        }

        if (array_key_exists('images', $input)) {
            $images = is_array($input['images']) ? array_values(array_map('intval', $input['images'])) : [];
            if (!empty($images) && $this->repo->existingMediaCount($images) !== count(array_unique($images))) {
                throw new DomainException('One or more images reference media that does not exist', 422);
            }
            $data['images'] = json_encode($images);
        }

        if (array_key_exists('slug', $input) && trim((string)$input['slug']) !== '') {
            $slug = slugify((string)$input['slug']);
        } elseif ($isCreate) {
            $slug = slugify($data['name_en']);
        } else {
            $slug = null;
        }

        if ($slug !== null) {
            if ($slug === '') {
                throw new DomainException('Could not derive a valid slug from the provided name', 422);
            }
            $conflict = $excludeId !== null
                ? $this->repo->existsExcluding('slug', $slug, $excludeId)
                : (bool) $this->repo->findBy('slug', $slug);
            if ($conflict) {
                throw new DomainException('A product with this slug already exists', 409);
            }
            $data['slug'] = $slug;
        }

        return $data;
    }

    private function resolveForeignKey(mixed $value, string $table, string $label): ?int
    {
        if ($value === null || $value === '') {
            return null;
        }
        $id = (int)$value;
        $exists = DatabaseManager::query("SELECT id FROM {$table} WHERE id = :id LIMIT 1", ['id' => $id])->fetch();
        if (!$exists) {
            throw new DomainException("{$label} not found", 422);
        }
        return $id;
    }

    /** @return array|null null means "not provided, leave existing specs untouched" */
    private function validateSpecifications(mixed $raw): ?array
    {
        if ($raw === null) {
            return null;
        }
        if (!is_array($raw)) {
            throw new DomainException('Specifications must be a list', 422);
        }

        $specs = [];
        foreach ($raw as $spec) {
            if (!is_array($spec)) {
                throw new DomainException('Each specification must be an object', 422);
            }
            $keyEn = trim((string)($spec['key_en'] ?? ''));
            $keyAr = trim((string)($spec['key_ar'] ?? ''));
            $valueEn = trim((string)($spec['value_en'] ?? ''));
            $valueAr = trim((string)($spec['value_ar'] ?? ''));
            if ($keyEn === '' || $keyAr === '' || $valueEn === '' || $valueAr === '') {
                throw new DomainException('Each specification needs key_en, key_ar, value_en, and value_ar', 422);
            }
            $specs[] = ['key_en' => $keyEn, 'key_ar' => $keyAr, 'value_en' => $valueEn, 'value_ar' => $valueAr];
        }

        return $specs;
    }

    /** @return array|null null means "not provided, leave existing cross-references untouched" */
    private function validateCrossReferences(mixed $raw): ?array
    {
        if ($raw === null) {
            return null;
        }
        if (!is_array($raw)) {
            throw new DomainException('cross_reference_numbers must be a list', 422);
        }

        $numbers = [];
        foreach ($raw as $number) {
            $trimmed = trim((string)$number);
            if ($trimmed !== '') {
                $numbers[] = $trimmed;
            }
        }

        return array_values(array_unique($numbers));
    }

    /** @return array|null null means "not provided, leave existing fitment untouched" */
    private function validateFitments(mixed $raw): ?array
    {
        if ($raw === null) {
            return null;
        }
        if (!is_array($raw)) {
            throw new DomainException('fitments must be a list', 422);
        }

        $minYear = self::MIN_FITMENT_YEAR;
        $maxYear = (int)date('Y') + 2;

        $rows = [];
        foreach ($raw as $fitment) {
            if (!is_array($fitment)) {
                throw new DomainException('Each fitment must be an object', 422);
            }
            $make = trim((string)($fitment['make'] ?? ''));
            $model = trim((string)($fitment['model'] ?? ''));
            if ($make === '' || $model === '') {
                throw new DomainException('Each fitment needs a make and model', 422);
            }

            $yearFrom = (int)($fitment['year_from'] ?? 0);
            $yearTo = (int)($fitment['year_to'] ?? 0);
            if ($yearFrom < $minYear || $yearFrom > $maxYear || $yearTo < $minYear || $yearTo > $maxYear) {
                throw new DomainException("Fitment years must be between {$minYear} and {$maxYear}", 422);
            }
            if ($yearTo < $yearFrom) {
                throw new DomainException('Fitment "year to" cannot be before the start year', 422);
            }

            $vinNote = trim((string)($fitment['vin_note'] ?? ''));
            $chassisCode = trim((string)($fitment['chassis_code'] ?? ''));

            $rows[] = [
                'make' => $make,
                'model' => $model,
                'chassis_code' => $chassisCode !== '' ? $chassisCode : null,
                'year_from' => $yearFrom,
                'year_to' => $yearTo,
                'vin_note' => $vinNote !== '' ? $vinNote : null,
            ];
        }

        return $rows;
    }
}
