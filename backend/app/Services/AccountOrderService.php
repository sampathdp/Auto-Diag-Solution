<?php

declare(strict_types=1);

namespace App\Services;

use App\Exceptions\DomainException;
use App\Repositories\OrderRepository;

class AccountOrderService
{
    private const CANCELLABLE_STATUSES = ['pending', 'processing'];

    private OrderRepository $repo;
    private ProductService $products;

    public function __construct()
    {
        $this->repo = new OrderRepository();
        $this->products = new ProductService();
    }

    public function list(int $userId, string $status, string $dateRange, string $search, int $page, int $perPage): array
    {
        $filters = ['user_id' => $userId];
        if ($status !== '' && $status !== 'all') {
            $filters['status'] = $status;
        }
        $dateFrom = $this->dateFromForRange($dateRange);
        if ($dateFrom) {
            $filters['date_from'] = $dateFrom;
        }

        $rows = $this->repo->paginate($filters, $search, 'created_at', 'DESC', $page, $perPage);
        $total = $this->repo->countFiltered($filters, $search);

        return [
            'items' => array_map(fn (array $row) => $this->shape($row, $this->repo->items((int)$row['id'])), $rows),
            'total' => $total,
        ];
    }

    public function show(int $userId, int $id): array
    {
        $order = $this->repo->findForUser($id, $userId);
        if (!$order) {
            throw new DomainException('Order not found', 404);
        }
        return $this->shape($order, $this->repo->items($id));
    }

    public function cancel(int $userId, int $id, ?string $reason): array
    {
        $order = $this->repo->findForUser($id, $userId);
        if (!$order) {
            throw new DomainException('Order not found', 404);
        }
        if (!in_array($order['status'], self::CANCELLABLE_STATUSES, true)) {
            throw new DomainException('This order can no longer be cancelled', 409);
        }

        $this->repo->update($id, [
            'status' => 'cancelled',
            'cancellation_reason' => trim((string)$reason) ?: null,
        ]);

        return $this->show($userId, $id);
    }

    public function requestRefund(int $userId, int $id, string $reason, string $description, array $items): array
    {
        $order = $this->repo->findForUser($id, $userId);
        if (!$order) {
            throw new DomainException('Order not found', 404);
        }
        if ($order['status'] !== 'delivered') {
            throw new DomainException('Only delivered orders are eligible for a refund request', 409);
        }

        $note = "Refund requested — reason: {$reason}. {$description}"
            . ($items ? ' Items: ' . implode(', ', $items) : '');

        $this->repo->update($id, [
            'status' => 'refunded',
            'refund_requested_at' => date('Y-m-d H:i:s'),
            'notes' => trim(($order['notes'] ?? '') . "\n" . $note),
        ]);

        return $this->show($userId, $id);
    }

    /**
     * Checks live stock for every item in a past order. Returns what's addable to the
     * cart right now vs what's no longer available — the frontend adds the former to
     * its client-side cart store itself, this endpoint only reports availability.
     */
    public function reorder(int $userId, int $id): array
    {
        $order = $this->repo->findForUser($id, $userId);
        if (!$order) {
            throw new DomainException('Order not found', 404);
        }
        $items = $this->repo->items($id);

        $productIds = array_values(array_unique(array_filter(
            array_map(fn (array $i) => $i['product_id'] !== null ? (int)$i['product_id'] : null, $items)
        )));
        $available = [];
        if ($productIds) {
            $result = $this->products->publicList(['ids' => $productIds], '', 'newest', 1, count($productIds));
            foreach ($result['items'] as $product) {
                if ($product['stock_status'] !== 'out_of_stock') {
                    $available[$product['id']] = true;
                }
            }
        }

        $added = [];
        $outOfStock = [];
        foreach ($items as $item) {
            $productId = $item['product_id'] !== null ? (int)$item['product_id'] : null;
            if ($productId !== null && isset($available[$productId])) {
                $added[] = ['product_id' => $productId, 'quantity' => (int)$item['quantity']];
            } else {
                $outOfStock[] = $item['name_en'];
            }
        }

        return [
            'cart_items' => count($added),
            'out_of_stock' => $outOfStock,
            'added' => $added,
        ];
    }

    private function dateFromForRange(string $range): ?string
    {
        return match ($range) {
            '30_days' => date('Y-m-d H:i:s', strtotime('-30 days')),
            '3_months' => date('Y-m-d H:i:s', strtotime('-3 months')),
            '1_year' => date('Y-m-d H:i:s', strtotime('-1 year')),
            default => null,
        };
    }

    private function shape(array $order, array $items): array
    {
        $productIds = array_values(array_unique(array_filter(
            array_map(fn (array $i) => $i['product_id'] !== null ? (int)$i['product_id'] : null, $items)
        )));
        $imagesByProduct = [];
        if ($productIds) {
            $result = $this->products->publicList(['ids' => $productIds], '', 'newest', 1, count($productIds));
            foreach ($result['items'] as $product) {
                $imagesByProduct[$product['id']] = $product['images'][0] ?? null;
            }
        }

        return [
            'id' => (int)$order['id'],
            'order_number' => $order['order_number'],
            'status' => $order['status'],
            'created_at' => $order['created_at'],
            'updated_at' => $order['updated_at'],
            'total_amount' => (float)$order['total'],
            'vat_amount' => (float)$order['vat_amount'],
            'shipping_amount' => (float)$order['shipping_amount'],
            'discount_amount' => (float)$order['discount_amount'],
            'cancellation_reason' => $order['cancellation_reason'] ?? null,
            'items' => array_map(function (array $item) use ($imagesByProduct) {
                $productId = $item['product_id'] !== null ? (int)$item['product_id'] : null;
                return [
                    'id' => (int)$item['id'],
                    'product_id' => $productId,
                    'sku' => $item['sku'],
                    'name_en' => $item['name_en'],
                    'name_ar' => $item['name_ar'],
                    'quantity' => (int)$item['quantity'],
                    'unit_price' => (float)$item['unit_price'],
                    'total_price' => (float)$item['line_total'],
                    'image' => $productId !== null ? ($imagesByProduct[$productId] ?? null) : null,
                ];
            }, $items),
            'shipping_address' => $this->decodeShippingSnapshot($order['shipping_snapshot'] ?? null),
        ];
    }

    private function decodeShippingSnapshot(?string $json): ?array
    {
        if (!$json) {
            return null;
        }
        $decoded = json_decode($json, true);
        return is_array($decoded) ? $decoded : null;
    }
}
