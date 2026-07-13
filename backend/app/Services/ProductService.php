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
    private const BOOLEAN_FIELDS = ['vat_inclusive', 'track_inventory', 'fits_all_vehicles'];

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
        $fitmentByProduct = $this->repo->fitmentForProducts(array_column($items, 'id'));

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
        $fitment = $this->repo->fitmentForProducts([$id])[$id] ?? [];
        $shaped = $this->shapePublic($product, $fitment);
        $shaped['specifications'] = $this->repo->specifications($id);
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
                // Media rows can point at an external URL (e.g. a stock photo used for
                // seed/test data) instead of a locally uploaded file — pass those through
                // as-is rather than mangling them into "{baseUrl}https://...".
                return str_starts_with($path, 'http://') || str_starts_with($path, 'https://')
                    ? $path
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
            'price_aed' => (float)$row['price'],
            'compare_at_price' => $row['compare_at_price'] !== null ? (float)$row['compare_at_price'] : null,
            'images' => $imageUrls,
            'stock' => (int)$row['stock_quantity'],
            'stock_status' => $row['stock_status'],
            'fits_all_vehicles' => (bool)$row['fits_all_vehicles'],
            'compatible_vehicles' => $fitment,
            'rating' => round((float)$row['rating'], 1),
            'reviews' => (int)$row['review_count'],
        ];
    }

    public function list(array $filters, string $search, string $sortBy, string $sortDir, int $page, int $perPage): array
    {
        $items = $this->repo->paginate($filters, $search, $sortBy, $sortDir, $page, $perPage);
        $vehicleIdsByProduct = $this->repo->vehicleIdsForProducts(array_column($items, 'id'));

        $shaped = array_map(function (array $row) use ($vehicleIdsByProduct) {
            $row = $this->shape($row);
            $row['vehicle_ids'] = $vehicleIdsByProduct[(int)$row['id']] ?? [];
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
        $product['vehicle_ids'] = array_map('intval', $this->repo->vehicleIds($id));
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
        $vehicleIds = $this->validateVehicleIds($input['vehicle_ids'] ?? null);

        DatabaseManager::beginTransaction();
        try {
            $id = $this->repo->create($data);
            if ($specs !== null) {
                $this->repo->replaceSpecifications($id, $specs);
            }
            if ($vehicleIds !== null && empty($data['fits_all_vehicles'])) {
                $this->repo->replaceFitment($id, $vehicleIds);
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
        $vehicleIds = $this->validateVehicleIds($input['vehicle_ids'] ?? null);

        DatabaseManager::beginTransaction();
        try {
            if (!empty($data)) {
                $this->repo->update($id, $data);
            }
            if ($specs !== null) {
                $this->repo->replaceSpecifications($id, $specs);
            }
            if ($vehicleIds !== null) {
                $fitsAll = array_key_exists('fits_all_vehicles', $data)
                    ? (bool)$data['fits_all_vehicles']
                    : (bool)$this->repo->find($id)['fits_all_vehicles'];
                if (!$fitsAll) {
                    $this->repo->replaceFitment($id, $vehicleIds);
                }
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
    public function updateFitment(int $id, mixed $rawVehicleIds): array
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
        $vehicleIds = $this->validateVehicleIds($rawVehicleIds) ?? [];
        $this->repo->replaceFitment($id, $vehicleIds);
        return $this->find($id);
    }

    public function delete(int $id): void
    {
        if (!$this->repo->find($id)) {
            throw new DomainException('Product not found', 404);
        }
        // product_specifications/product_vehicle/cart_items/wishlists CASCADE; order_items
        // SET NULL (order history keeps its sku/name/price snapshot) — schema already
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

        foreach (['vat_inclusive', 'track_inventory', 'fits_all_vehicles'] as $field) {
            if (array_key_exists($field, $input)) {
                $data[$field] = (int)(bool)$input[$field];
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

    /** @return array|null null means "not provided, leave existing fitment untouched" */
    private function validateVehicleIds(mixed $raw): ?array
    {
        if ($raw === null) {
            return null;
        }
        if (!is_array($raw)) {
            throw new DomainException('vehicle_ids must be a list', 422);
        }

        $ids = array_values(array_unique(array_map('intval', $raw)));
        if (!empty($ids) && $this->repo->existingVehicleCount($ids) !== count($ids)) {
            throw new DomainException('One or more vehicle_ids do not exist', 422);
        }

        return $ids;
    }
}
