<?php

declare(strict_types=1);

namespace App\Repositories;

use App\Core\Database\DatabaseManager;

class ProductRepository extends BaseRepository
{
    private const SORTABLE_COLUMNS = ['id', 'name_en', 'price', 'stock_quantity', 'created_at'];

    private const PUBLIC_SORT_COLUMNS = [
        'price_asc' => ['p.price', 'ASC'],
        'price_desc' => ['p.price', 'DESC'],
        'name_asc' => ['p.name_en', 'ASC'],
        'newest' => ['p.created_at', 'DESC'],
    ];

    public function __construct()
    {
        parent::__construct('products');
    }

    /**
     * Paginated list with category/brand display names joined in — avoids a separate
     * lookup per row in the admin product table UI.
     */
    public function paginate(array $filters, string $search, string $sortBy, string $sortDir, int $page, int $perPage): array
    {
        [$whereSql, $params] = $this->buildWhere($filters, $search);
        $sortBy = in_array($sortBy, self::SORTABLE_COLUMNS, true) ? $sortBy : 'created_at';
        $sortDir = strtoupper($sortDir) === 'DESC' ? 'DESC' : 'ASC';
        $offset = ($page - 1) * $perPage;

        $sql = "SELECT p.*, c.name_en AS category_name_en, b.name_en AS brand_name_en
                FROM products p
                LEFT JOIN categories c ON c.id = p.category_id
                LEFT JOIN brands b ON b.id = p.brand_id
                {$whereSql}
                ORDER BY p.{$sortBy} {$sortDir}
                LIMIT {$perPage} OFFSET {$offset}";

        return DatabaseManager::query($sql, $params)->fetchAll();
    }

    public function countFiltered(array $filters, string $search): int
    {
        [$whereSql, $params] = $this->buildWhere($filters, $search);
        $sql = "SELECT COUNT(*) AS c FROM products p {$whereSql}";
        return (int) DatabaseManager::query($sql, $params)->fetch()['c'];
    }

    public function specifications(int $productId): array
    {
        return DatabaseManager::query(
            "SELECT id, key_en, key_ar, value_en, value_ar, sort_order
             FROM product_specifications WHERE product_id = :id ORDER BY sort_order ASC",
            ['id' => $productId]
        )->fetchAll();
    }

    /** Fitment rows for a single product, ordered as entered. */
    public function fitmentRowsForProduct(int $productId): array
    {
        return DatabaseManager::query(
            "SELECT id, make, model, year_from, year_to, vin_note
             FROM product_fitments WHERE product_id = :id ORDER BY id ASC",
            ['id' => $productId]
        )->fetchAll();
    }

    /**
     * Fitment rows for a batch of products in one query — used by list()
     * so the admin table doesn't pay an N+1 for `fitments`. Returns
     * product_id => row[], omitting products with no fitment rows.
     */
    public function fitmentRowsForProducts(array $productIds): array
    {
        if (empty($productIds)) {
            return [];
        }
        $placeholders = implode(',', array_fill(0, count($productIds), '?'));
        $rows = DatabaseManager::query(
            "SELECT id, product_id, make, model, year_from, year_to, vin_note
             FROM product_fitments WHERE product_id IN ($placeholders) ORDER BY id ASC",
            array_values($productIds)
        )->fetchAll();

        $map = [];
        foreach ($rows as $row) {
            $productId = (int)$row['product_id'];
            unset($row['product_id']);
            $map[$productId][] = $row;
        }
        return $map;
    }

    /** Cross-reference numbers for a single product, ordered as entered. */
    public function crossReferences(int $productId): array
    {
        return DatabaseManager::query(
            "SELECT cross_number FROM product_cross_references WHERE product_id = :id ORDER BY id ASC",
            ['id' => $productId]
        )->fetchAll(\PDO::FETCH_COLUMN);
    }

    /**
     * Cross-reference numbers for a batch of products in one query — used by list()
     * so the admin table doesn't pay an N+1. Returns product_id => cross_number[].
     */
    public function crossReferencesForProducts(array $productIds): array
    {
        if (empty($productIds)) {
            return [];
        }
        $placeholders = implode(',', array_fill(0, count($productIds), '?'));
        $rows = DatabaseManager::query(
            "SELECT product_id, cross_number FROM product_cross_references
             WHERE product_id IN ($placeholders) ORDER BY id ASC",
            array_values($productIds)
        )->fetchAll();

        $map = [];
        foreach ($rows as $row) {
            $map[(int)$row['product_id']][] = $row['cross_number'];
        }
        return $map;
    }

    /** Replaces the full cross-reference set for a product (delete-then-insert). */
    public function replaceCrossReferences(int $productId, array $crossNumbers): void
    {
        DatabaseManager::query("DELETE FROM product_cross_references WHERE product_id = :id", ['id' => $productId]);
        foreach ($crossNumbers as $crossNumber) {
            DatabaseManager::query(
                "INSERT INTO product_cross_references (product_id, cross_number) VALUES (:product_id, :cross_number)",
                ['product_id' => $productId, 'cross_number' => $crossNumber]
            );
        }
    }

    /** Replaces the full specification set for a product (delete-then-insert). */
    public function replaceSpecifications(int $productId, array $specs): void
    {
        DatabaseManager::query("DELETE FROM product_specifications WHERE product_id = :id", ['id' => $productId]);
        foreach ($specs as $i => $spec) {
            DatabaseManager::query(
                "INSERT INTO product_specifications (product_id, key_en, key_ar, value_en, value_ar, sort_order)
                 VALUES (:product_id, :key_en, :key_ar, :value_en, :value_ar, :sort_order)",
                [
                    'product_id' => $productId,
                    'key_en' => $spec['key_en'],
                    'key_ar' => $spec['key_ar'],
                    'value_en' => $spec['value_en'],
                    'value_ar' => $spec['value_ar'],
                    'sort_order' => $i,
                ]
            );
        }
    }

    /** Replaces the full fitment set for a product (delete-then-insert). */
    public function replaceFitments(int $productId, array $rows): void
    {
        DatabaseManager::query("DELETE FROM product_fitments WHERE product_id = :id", ['id' => $productId]);
        foreach ($rows as $row) {
            DatabaseManager::query(
                "INSERT INTO product_fitments (product_id, make, model, year_from, year_to, vin_note)
                 VALUES (:product_id, :make, :model, :year_from, :year_to, :vin_note)",
                [
                    'product_id' => $productId,
                    'make' => $row['make'],
                    'model' => $row['model'],
                    'year_from' => $row['year_from'],
                    'year_to' => $row['year_to'],
                    'vin_note' => $row['vin_note'],
                ]
            );
        }
    }

    /** Count of the given media IDs that actually exist — used to validate `images` in one query. */
    public function existingMediaCount(array $mediaIds): int
    {
        if (empty($mediaIds)) {
            return 0;
        }
        $placeholders = implode(',', array_fill(0, count($mediaIds), '?'));
        $stmt = DatabaseManager::query("SELECT COUNT(*) AS c FROM media WHERE id IN ($placeholders)", array_values($mediaIds));
        return (int) $stmt->fetch()['c'];
    }

    /**
     * Public storefront listing — active products only, joined with category/brand
     * display data and an approved-reviews rating aggregate. Kept separate from
     * paginate() so the admin listing's status filter/internal fields stay admin-only.
     */
    public function publicPaginate(array $filters, string $search, string $sort, int $page, int $perPage): array
    {
        [$whereSql, $params] = $this->buildPublicWhere($filters, $search);
        [$sortSql, $sortDir] = self::PUBLIC_SORT_COLUMNS[$sort] ?? ['p.created_at', 'DESC'];
        $offset = ($page - 1) * $perPage;

        $sql = "SELECT p.*, c.name_en AS category_name_en, c.name_ar AS category_name_ar, c.slug AS category_slug,
                       b.name_en AS brand_name_en, b.name_ar AS brand_name_ar, b.slug AS brand_slug,
                       COALESCE(rv.avg_rating, 0) AS rating, COALESCE(rv.review_count, 0) AS review_count
                FROM products p
                LEFT JOIN categories c ON c.id = p.category_id
                LEFT JOIN brands b ON b.id = p.brand_id
                LEFT JOIN (
                    SELECT product_id, AVG(rating) AS avg_rating, COUNT(*) AS review_count
                    FROM reviews WHERE is_approved = 1 GROUP BY product_id
                ) rv ON rv.product_id = p.id
                {$whereSql}
                ORDER BY {$sortSql} {$sortDir}
                LIMIT {$perPage} OFFSET {$offset}";

        return DatabaseManager::query($sql, $params)->fetchAll();
    }

    public function publicCountFiltered(array $filters, string $search): int
    {
        [$whereSql, $params] = $this->buildPublicWhere($filters, $search);
        $sql = "SELECT COUNT(*) AS c
                FROM products p
                LEFT JOIN categories c ON c.id = p.category_id
                LEFT JOIN brands b ON b.id = p.brand_id
                LEFT JOIN (
                    SELECT product_id, AVG(rating) AS avg_rating, COUNT(*) AS review_count
                    FROM reviews WHERE is_approved = 1 GROUP BY product_id
                ) rv ON rv.product_id = p.id
                {$whereSql}";
        return (int) DatabaseManager::query($sql, $params)->fetch()['c'];
    }

    public function findActiveById(int $id): ?array
    {
        $row = DatabaseManager::query(
            "SELECT p.*, c.name_en AS category_name_en, c.name_ar AS category_name_ar, c.slug AS category_slug,
                    b.name_en AS brand_name_en, b.name_ar AS brand_name_ar, b.slug AS brand_slug,
                    COALESCE(rv.avg_rating, 0) AS rating, COALESCE(rv.review_count, 0) AS review_count
             FROM products p
             LEFT JOIN categories c ON c.id = p.category_id
             LEFT JOIN brands b ON b.id = p.brand_id
             LEFT JOIN (
                 SELECT product_id, AVG(rating) AS avg_rating, COUNT(*) AS review_count
                 FROM reviews WHERE is_approved = 1 GROUP BY product_id
             ) rv ON rv.product_id = p.id
             WHERE p.id = :id AND p.status = 'active'
             LIMIT 1",
            ['id' => $id]
        )->fetch();

        return $row ?: null;
    }

    private function buildPublicWhere(array $filters, string $search): array
    {
        $conditions = ["p.status = 'active'"];
        $params = [];

        if (!empty($filters['category'])) {
            $conditions[] = 'c.slug = :category_slug';
            $params['category_slug'] = $filters['category'];
        }

        if (!empty($filters['brands']) && is_array($filters['brands'])) {
            $names = [];
            foreach (array_values($filters['brands']) as $i => $slug) {
                $key = "brand_slug{$i}";
                $names[] = ":{$key}";
                $params[$key] = $slug;
            }
            $conditions[] = 'b.slug IN (' . implode(',', $names) . ')';
        }

        if (isset($filters['min_price'])) {
            $conditions[] = 'p.price >= :min_price';
            $params['min_price'] = $filters['min_price'];
        }
        if (isset($filters['max_price'])) {
            $conditions[] = 'p.price <= :max_price';
            $params['max_price'] = $filters['max_price'];
        }

        if (!empty($filters['in_stock'])) {
            $conditions[] = "p.stock_status != 'out_of_stock'";
        }

        if (!empty($filters['fits_year']) || !empty($filters['fits_make']) || !empty($filters['fits_model'])) {
            $fitConditions = ['pf.product_id = p.id'];
            if (!empty($filters['fits_year'])) {
                // Two distinct placeholders bound to the same value — MySQL's native
                // prepares (unlike emulated ones) reject reusing one named placeholder twice.
                $fitConditions[] = 'pf.year_from <= :fits_year_max AND pf.year_to >= :fits_year_min';
                $params['fits_year_max'] = (int)$filters['fits_year'];
                $params['fits_year_min'] = (int)$filters['fits_year'];
            }
            if (!empty($filters['fits_make'])) {
                $fitConditions[] = 'LOWER(pf.make) = LOWER(:fits_make)';
                $params['fits_make'] = $filters['fits_make'];
            }
            if (!empty($filters['fits_model'])) {
                $fitConditions[] = 'LOWER(pf.model) = LOWER(:fits_model)';
                $params['fits_model'] = $filters['fits_model'];
            }
            $fitWhere = implode(' AND ', $fitConditions);
            $conditions[] = "(p.fits_all_vehicles = 1 OR EXISTS (
                SELECT 1 FROM product_fitments pf WHERE {$fitWhere}
            ))";
        }

        if (isset($filters['rating'])) {
            $conditions[] = 'COALESCE(rv.avg_rating, 0) >= :min_rating';
            $params['min_rating'] = $filters['rating'];
        }

        if (!empty($filters['ids']) && is_array($filters['ids'])) {
            $names = [];
            foreach (array_values($filters['ids']) as $i => $id) {
                $key = "id{$i}";
                $names[] = ":{$key}";
                $params[$key] = (int)$id;
            }
            $conditions[] = 'p.id IN (' . implode(',', $names) . ')';
        }

        if ($search !== '') {
            $conditions[] = 'MATCH(p.name_en, p.name_ar, p.short_description_en, p.short_description_ar) AGAINST (:search IN NATURAL LANGUAGE MODE)';
            $params['search'] = $search;
        }

        return ['WHERE ' . implode(' AND ', $conditions), $params];
    }

    private function buildWhere(array $filters, string $search): array
    {
        $conditions = [];
        $params = [];

        foreach (['category_id', 'brand_id', 'status', 'stock_status'] as $column) {
            if (array_key_exists($column, $filters)) {
                $conditions[] = "p.{$column} = :{$column}";
                $params[$column] = $filters[$column];
            }
        }

        // Not a plain column match — "low stock" is a computed condition (mirrors
        // DashboardService::stats()'s own low_stock_count definition), not a stored value.
        if (!empty($filters['low_stock'])) {
            $conditions[] = 'p.track_inventory = 1 AND p.low_stock_threshold IS NOT NULL AND p.stock_quantity <= p.low_stock_threshold';
        }

        if ($search !== '') {
            // LIKE (not the FULLTEXT index) — admins commonly search partial SKUs/codes,
            // which a natural-language FULLTEXT match handles poorly. FULLTEXT is reserved
            // for the storefront's product search in a later phase.
            $conditions[] = '(p.name_en LIKE :search1 OR p.name_ar LIKE :search2 OR p.sku LIKE :search3)';
            $like = '%' . $search . '%';
            $params['search1'] = $like;
            $params['search2'] = $like;
            $params['search3'] = $like;
        }

        $sql = !empty($conditions) ? 'WHERE ' . implode(' AND ', $conditions) : '';
        return [$sql, $params];
    }
}
