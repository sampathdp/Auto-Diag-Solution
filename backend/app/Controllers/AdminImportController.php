<?php

declare(strict_types=1);

namespace App\Controllers;

use App\Core\Request;
use App\Core\Database\DatabaseManager;

class AdminImportController extends BaseController
{
    // ─── CSV Templates ────────────────────────────────────────────────────────

    public function template(Request $request): void
    {
        $type = $request->getParam('type') ?? 'inventory';

        $templates = [
            'inventory' => [
                'filename' => 'inventory_template.csv',
                'rows'     => [
                    ['name', 'sku', 'cost_price', 'selling_price', 'stock_quantity', 'low_stock_alert'],
                    ['Shampoo Pro', 'SH-001', '500', '750', '10', '2'],
                    ['Hair Dye Black', 'HD-001', '300', '450', '20', '5'],
                ],
            ],
            'categories' => [
                'filename' => 'service_categories_template.csv',
                'rows'     => [
                    ['name'],
                    ['Hair Services'],
                    ['Nail Services'],
                    ['Skin Care'],
                ],
            ],
            'services' => [
                'filename' => 'services_template.csv',
                'rows'     => [
                    ['name', 'category_name', 'price', 'duration_minutes', 'description'],
                    ['Haircut', 'Hair Services', '1500', '30', 'Basic haircut'],
                    ['Hair Colour', 'Hair Services', '3500', '90', 'Full hair colour'],
                    ['Manicure', 'Nail Services', '1200', '45', ''],
                ],
            ],
        ];

        $tpl = $templates[$type] ?? $templates['inventory'];

        header('Content-Type: text/csv');
        header('Content-Disposition: attachment; filename="' . $tpl['filename'] . '"');

        $out = fopen('php://output', 'w');
        foreach ($tpl['rows'] as $row) {
            fputcsv($out, $row);
        }
        fclose($out);
        exit;
    }

    // ─── Import Inventory (products table) ────────────────────────────────────

    public function importInventory(Request $request): void
    {
        $salonId = (int) $request->getParam('id');
        if (!$salonId) { $this->error('Salon ID required.'); return; }

        $file = $_FILES['file'] ?? null;
        if (!$file || $file['error'] !== UPLOAD_ERR_OK) {
            $this->error('No CSV file uploaded.');
            return;
        }

        $rows    = $this->parseCsv($file['tmp_name']);
        $headers = array_map('strtolower', array_map('trim', $rows[0] ?? []));

        $required = ['name'];
        foreach ($required as $col) {
            if (!in_array($col, $headers)) {
                $this->error("CSV must have a '{$col}' column.");
                return;
            }
        }

        $imported = 0;
        $skipped  = 0;
        $errors   = [];

        foreach (array_slice($rows, 1) as $i => $row) {
            if (count(array_filter($row)) === 0) continue;

            $data = array_combine($headers, array_pad($row, count($headers), ''));
            $name = trim($data['name'] ?? '');

            if (!$name) { $skipped++; continue; }

            try {
                DatabaseManager::query(
                    "INSERT INTO products
                        (salon_id, name, sku, cost_price, selling_price, stock_quantity, low_stock_alert)
                     VALUES
                        (:salon_id, :name, :sku, :cost_price, :selling_price, :stock_quantity, :low_stock_alert)
                     ON DUPLICATE KEY UPDATE
                        sku = VALUES(sku), cost_price = VALUES(cost_price),
                        selling_price = VALUES(selling_price), stock_quantity = VALUES(stock_quantity),
                        low_stock_alert = VALUES(low_stock_alert)",
                    [
                        'salon_id'       => $salonId,
                        'name'           => $name,
                        'sku'            => trim($data['sku'] ?? ''),
                        'cost_price'     => (float)($data['cost_price'] ?? 0),
                        'selling_price'  => (float)($data['selling_price'] ?? 0),
                        'stock_quantity' => (int)($data['stock_quantity'] ?? 0),
                        'low_stock_alert'=> (int)($data['low_stock_alert'] ?? 0),
                    ]
                );
                $imported++;
            } catch (\Exception $e) {
                $errors[] = "Row " . ($i + 2) . ": " . $e->getMessage();
                $skipped++;
            }
        }

        $this->success(
            ['imported' => $imported, 'skipped' => $skipped, 'errors' => $errors],
            "{$imported} inventory item(s) imported successfully."
        );
    }

    // ─── Import Service Categories ─────────────────────────────────────────────

    public function importCategories(Request $request): void
    {
        $salonId = (int) $request->getParam('id');
        if (!$salonId) { $this->error('Salon ID required.'); return; }

        $file = $_FILES['file'] ?? null;
        if (!$file || $file['error'] !== UPLOAD_ERR_OK) {
            $this->error('No CSV file uploaded.');
            return;
        }

        $rows    = $this->parseCsv($file['tmp_name']);
        $headers = array_map('strtolower', array_map('trim', $rows[0] ?? []));

        if (!in_array('name', $headers)) {
            $this->error("CSV must have a 'name' column.");
            return;
        }

        $imported = 0;
        $skipped  = 0;

        foreach (array_slice($rows, 1) as $row) {
            if (count(array_filter($row)) === 0) continue;

            $data = array_combine($headers, array_pad($row, count($headers), ''));
            $name = trim($data['name'] ?? '');
            if (!$name) { $skipped++; continue; }

            DatabaseManager::query(
                "INSERT IGNORE INTO service_categories (salon_id, name) VALUES (:salon_id, :name)",
                ['salon_id' => $salonId, 'name' => $name]
            );
            $imported++;
        }

        $this->success(
            ['imported' => $imported, 'skipped' => $skipped, 'errors' => []],
            "{$imported} service category/categories imported."
        );
    }

    // ─── Import Services ───────────────────────────────────────────────────────

    public function importServices(Request $request): void
    {
        $salonId = (int) $request->getParam('id');
        if (!$salonId) { $this->error('Salon ID required.'); return; }

        $file = $_FILES['file'] ?? null;
        if (!$file || $file['error'] !== UPLOAD_ERR_OK) {
            $this->error('No CSV file uploaded.');
            return;
        }

        $rows    = $this->parseCsv($file['tmp_name']);
        $headers = array_map('strtolower', array_map('trim', $rows[0] ?? []));

        if (!in_array('name', $headers) || !in_array('price', $headers)) {
            $this->error("CSV must have 'name' and 'price' columns.");
            return;
        }

        // Cache category name → id to avoid repeated queries
        $categoryCache = [];
        $getOrCreateCategory = function (string $catName) use ($salonId, &$categoryCache): ?int {
            if (!$catName) return null;
            if (isset($categoryCache[$catName])) return $categoryCache[$catName];

            $existing = DatabaseManager::query(
                "SELECT id FROM service_categories WHERE salon_id = :sid AND name = :name LIMIT 1",
                ['sid' => $salonId, 'name' => $catName]
            )->fetch();

            if ($existing) {
                $id = (int)$existing['id'];
            } else {
                DatabaseManager::query(
                    "INSERT INTO service_categories (salon_id, name) VALUES (:sid, :name)",
                    ['sid' => $salonId, 'name' => $catName]
                );
                $id = (int)DatabaseManager::getLastInsertId();
            }

            return $categoryCache[$catName] = $id;
        };

        $imported = 0;
        $skipped  = 0;
        $errors   = [];

        foreach (array_slice($rows, 1) as $i => $row) {
            if (count(array_filter($row)) === 0) continue;

            $data = array_combine($headers, array_pad($row, count($headers), ''));
            $name = trim($data['name'] ?? '');
            if (!$name) { $skipped++; continue; }

            try {
                $catName    = trim($data['category_name'] ?? '');
                $categoryId = $catName ? $getOrCreateCategory($catName) : null;

                DatabaseManager::query(
                    "INSERT INTO services
                        (salon_id, name, category_id, price, duration_minutes, description, is_active)
                     VALUES
                        (:salon_id, :name, :cat_id, :price, :duration, :desc, 1)
                     ON DUPLICATE KEY UPDATE
                        category_id = VALUES(category_id), price = VALUES(price),
                        duration_minutes = VALUES(duration_minutes), description = VALUES(description)",
                    [
                        'salon_id' => $salonId,
                        'name'     => $name,
                        'cat_id'   => $categoryId,
                        'price'    => (float)($data['price'] ?? 0),
                        'duration' => (int)($data['duration_minutes'] ?? 30),
                        'desc'     => trim($data['description'] ?? ''),
                    ]
                );
                $imported++;
            } catch (\Exception $e) {
                $errors[] = "Row " . ($i + 2) . ": " . $e->getMessage();
                $skipped++;
            }
        }

        $this->success(
            ['imported' => $imported, 'skipped' => $skipped, 'errors' => $errors],
            "{$imported} service(s) imported successfully."
        );
    }

    // ─── Helpers ───────────────────────────────────────────────────────────────

    private function parseCsv(string $filePath): array
    {
        $rows = [];
        if (($handle = fopen($filePath, 'r')) !== false) {
            while (($row = fgetcsv($handle)) !== false) {
                $rows[] = $row;
            }
            fclose($handle);
        }
        return $rows;
    }
}
