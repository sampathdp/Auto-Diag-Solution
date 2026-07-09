<?php

declare(strict_types=1);

namespace App\Repositories;

use App\Core\Database\DatabaseManager;

class ProductRepository extends BaseRepository
{
    private const SORTABLE_COLUMNS = ['id', 'name_en', 'price', 'stock_quantity', 'created_at'];

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

    public function vehicleIds(int $productId): array
    {
        return DatabaseManager::query(
            "SELECT vehicle_id FROM product_vehicle WHERE product_id = :id",
            ['id' => $productId]
        )->fetchAll(\PDO::FETCH_COLUMN);
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

    /** Replaces the full vehicle-fitment set for a product (delete-then-insert). */
    public function replaceFitment(int $productId, array $vehicleIds): void
    {
        DatabaseManager::query("DELETE FROM product_vehicle WHERE product_id = :id", ['id' => $productId]);
        foreach ($vehicleIds as $vehicleId) {
            DatabaseManager::query(
                "INSERT INTO product_vehicle (product_id, vehicle_id) VALUES (:product_id, :vehicle_id)",
                ['product_id' => $productId, 'vehicle_id' => $vehicleId]
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

    /** Count of the given vehicle IDs that actually exist — used to validate `vehicle_ids` in one query. */
    public function existingVehicleCount(array $vehicleIds): int
    {
        if (empty($vehicleIds)) {
            return 0;
        }
        $placeholders = implode(',', array_fill(0, count($vehicleIds), '?'));
        $stmt = DatabaseManager::query("SELECT COUNT(*) AS c FROM vehicles WHERE id IN ($placeholders)", array_values($vehicleIds));
        return (int) $stmt->fetch()['c'];
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
