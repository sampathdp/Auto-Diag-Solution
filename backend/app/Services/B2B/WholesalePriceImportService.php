<?php

declare(strict_types=1);

namespace App\Services\B2B;

use App\Core\Database\DatabaseManager;
use App\Exceptions\DomainException;
use App\Repositories\ProductRepository;
use App\Services\AdminActivityLogger;

/**
 * Bulk backfill of wholesale prices by CSV, keyed by SKU.
 *
 * Export gives every product (or only those still missing a price) with its retail
 * price for reference. Import reads `sku, wholesale_price[, wholesale_min_qty]`:
 * - a blank wholesale_price cell leaves that product as it is, so the export can be
 *   filled in partly and sent back;
 * - every row is checked first (SKU exists, price > 0 and not above retail, min qty a
 *   whole number of 1 or more), and nothing is saved if any row fails;
 * - dry_run checks without saving, for a preview.
 */
final class WholesalePriceImportService
{
    private const MAX_BYTES = 2 * 1024 * 1024;
    private const MAX_ROWS = 10000;

    private ProductRepository $products;

    public function __construct()
    {
        $this->products = new ProductRepository();
    }

    /** Streams the CSV straight to the client. */
    public function streamExport(bool $missingOnly): void
    {
        $rows = $this->products->wholesaleExportRows($missingOnly);

        header('Content-Type: text/csv; charset=utf-8');
        header('Content-Disposition: attachment; filename="wholesale-prices-' . date('Y-m-d') . '.csv"');
        header('Cache-Control: no-store');

        $out = fopen('php://output', 'w');
        // UTF-8 BOM so Excel shows Arabic product names correctly.
        fwrite($out, "\xEF\xBB\xBF");
        fputcsv($out, ['sku', 'name_en', 'status', 'retail_price', 'wholesale_price', 'wholesale_min_qty'], ',', '"', '');
        foreach ($rows as $row) {
            fputcsv($out, [
                $row['sku'],
                self::neutraliseFormula((string)$row['name_en']),
                $row['status'],
                $row['price'],
                $row['wholesale_price'] ?? '',
                $row['wholesale_min_qty'] ?? '',
            ], ',', '"', '');
        }
        fclose($out);
    }

    /**
     * @param array|null $file one entry of $_FILES
     * @return array{dry_run:bool, rows:int, updated:int, unchanged:int, skipped_blank:int, errors:array<int, array{line:int, sku:string, message:string}>, missing_after:int}
     */
    public function import(int $adminId, ?array $file, bool $dryRun): array
    {
        if (!$file || ($file['error'] ?? UPLOAD_ERR_NO_FILE) !== UPLOAD_ERR_OK || !is_uploaded_file((string)$file['tmp_name'])) {
            throw new DomainException('Choose a CSV file to upload', 422);
        }
        if ((int)$file['size'] > self::MAX_BYTES) {
            throw new DomainException('The CSV file is too large (2 MB at most)', 422);
        }

        $parsed = $this->parse((string)$file['tmp_name']);
        $bySku = $this->products->findBySkus(array_map(fn ($r) => $r['sku'], $parsed['rows']));

        $errors = $parsed['errors'];
        $changes = [];
        $unchanged = 0;
        $seen = [];

        foreach ($parsed['rows'] as $r) {
            $key = mb_strtolower($r['sku']);
            if (isset($seen[$key])) {
                $errors[] = ['line' => $r['line'], 'sku' => $r['sku'], 'message' => "SKU appears more than once (first on line {$seen[$key]})"];
                continue;
            }
            $seen[$key] = $r['line'];

            $product = $bySku[$key] ?? null;
            if (!$product) {
                $errors[] = ['line' => $r['line'], 'sku' => $r['sku'], 'message' => 'No product with this SKU'];
                continue;
            }
            if ($r['wholesale_price'] > (float)$product['price']) {
                $errors[] = ['line' => $r['line'], 'sku' => $r['sku'], 'message' => "Wholesale price is higher than the retail price ({$product['price']})"];
                continue;
            }

            $newMin = $r['has_min_qty'] ? $r['wholesale_min_qty'] : ($product['wholesale_min_qty'] !== null ? (int)$product['wholesale_min_qty'] : null);
            $oldPrice = $product['wholesale_price'] !== null ? round((float)$product['wholesale_price'], 2) : null;
            $oldMin = $product['wholesale_min_qty'] !== null ? (int)$product['wholesale_min_qty'] : null;
            if ($oldPrice === $r['wholesale_price'] && $oldMin === $newMin) {
                $unchanged++;
                continue;
            }
            $changes[] = [
                'id' => (int)$product['id'],
                'sku' => (string)$product['sku'],
                'wholesale_price' => $r['wholesale_price'],
                'wholesale_min_qty' => $newMin,
                'old_wholesale_price' => $oldPrice,
            ];
        }

        usort($errors, fn ($a, $b) => $a['line'] <=> $b['line']);
        $saved = !$dryRun && !$errors && $changes;

        if ($saved) {
            DatabaseManager::beginTransaction();
            try {
                foreach ($changes as $c) {
                    DatabaseManager::query(
                        "UPDATE products SET wholesale_price = :price, wholesale_min_qty = :min_qty WHERE id = :id",
                        ['price' => $c['wholesale_price'], 'min_qty' => $c['wholesale_min_qty'], 'id' => $c['id']]
                    );
                }
                DatabaseManager::commit();
            } catch (\Throwable $e) {
                DatabaseManager::rollBack();
                throw $e;
            }
            AdminActivityLogger::log($adminId, 'product.wholesale_imported', 'product', null, [
                'updated' => count($changes),
                'skus' => array_slice(array_column($changes, 'sku'), 0, 200),
            ]);
        }

        return [
            'dry_run' => $dryRun,
            'saved' => $saved,
            'rows' => count($parsed['rows']) + count($parsed['errors']) + $parsed['blank'],
            'updated' => count($changes),
            'unchanged' => $unchanged,
            'skipped_blank' => $parsed['blank'],
            'errors' => array_slice($errors, 0, 200),
            'error_count' => count($errors),
            'missing_after' => $this->products->countMissingWholesale(),
        ];
    }

    /**
     * @return array{rows: array<int, array{line:int, sku:string, wholesale_price:float, has_min_qty:bool, wholesale_min_qty:?int}>, errors: array, blank:int}
     */
    private function parse(string $path): array
    {
        $fh = fopen($path, 'r');
        if ($fh === false) {
            throw new DomainException('Could not read the CSV file', 422);
        }

        $header = fgetcsv($fh, 0, ',', '"', '');
        if ($header === false || $header === [null]) {
            fclose($fh);
            throw new DomainException('The CSV file is empty', 422);
        }
        $header[0] = preg_replace('/^\xEF\xBB\xBF/', '', (string)$header[0]);
        $cols = array_flip(array_map(fn ($h) => strtolower(trim((string)$h)), $header));
        if (!isset($cols['sku'], $cols['wholesale_price'])) {
            fclose($fh);
            throw new DomainException('The CSV needs a header row with "sku" and "wholesale_price" columns', 422);
        }
        $minCol = $cols['wholesale_min_qty'] ?? null;

        $rows = [];
        $errors = [];
        $blank = 0;
        $line = 1;
        while (($cells = fgetcsv($fh, 0, ',', '"', '')) !== false) {
            $line++;
            if ($line - 1 > self::MAX_ROWS) {
                fclose($fh);
                throw new DomainException('The CSV has too many rows (' . self::MAX_ROWS . ' at most)', 422);
            }
            if ($cells === [null] || implode('', array_map('trim', array_map('strval', $cells))) === '') {
                continue;
            }

            $sku = trim((string)($cells[$cols['sku']] ?? ''));
            $priceRaw = trim((string)($cells[$cols['wholesale_price']] ?? ''));
            $minRaw = $minCol !== null ? trim((string)($cells[$minCol] ?? '')) : '';

            if ($sku === '') {
                $errors[] = ['line' => $line, 'sku' => '', 'message' => 'SKU is missing'];
                continue;
            }
            if ($priceRaw === '') {
                $blank++;
                continue;
            }
            $priceRaw = str_replace([',', ' '], '', $priceRaw);
            if (!is_numeric($priceRaw) || (float)$priceRaw <= 0) {
                $errors[] = ['line' => $line, 'sku' => $sku, 'message' => 'Wholesale price must be a number greater than 0'];
                continue;
            }

            $min = null;
            if ($minRaw !== '') {
                if (filter_var($minRaw, FILTER_VALIDATE_INT) === false || (int)$minRaw < 1) {
                    $errors[] = ['line' => $line, 'sku' => $sku, 'message' => 'Minimum quantity must be a whole number of 1 or more'];
                    continue;
                }
                $min = (int)$minRaw;
            }

            $rows[] = [
                'line' => $line,
                'sku' => $sku,
                'wholesale_price' => round((float)$priceRaw, 2),
                // Only a filled-in min qty cell changes the stored value.
                'has_min_qty' => $minRaw !== '',
                'wholesale_min_qty' => $min,
            ];
        }
        fclose($fh);

        return ['rows' => $rows, 'errors' => $errors, 'blank' => $blank];
    }

    /** Stops a product name starting with = + - @ from running as a spreadsheet formula. */
    private static function neutraliseFormula(string $value): string
    {
        return $value !== '' && strpbrk($value[0], "=+-@\t\r") !== false ? "'" . $value : $value;
    }
}
