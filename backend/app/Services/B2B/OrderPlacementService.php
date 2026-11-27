<?php

declare(strict_types=1);

namespace App\Services\B2B;

use App\Core\Database\DatabaseManager;
use App\Exceptions\DomainException;
use App\Repositories\OrderRepository;
use App\Repositories\PaymentTransactionRepository;
use App\Repositories\ProductRepository;
use App\Services\CommissionService;
use App\Services\PromoCodeService;

/**
 * The shared order-writing core, extracted from CheckoutService::createOrder so retail
 * checkout, dealer checkout and (Phase 4) quotation conversion all write orders the
 * same way. Callers have already priced the lines and worked out the totals; this only
 * writes, inside one transaction:
 *
 *   order row → promo usage + commission → items → guarded stock decrements →
 *   optional payment transaction → first status-history entry
 *
 * Any failure rolls the whole order back, so stock and promo usage are never consumed
 * by an order that doesn't exist.
 */
final class OrderPlacementService
{
    private OrderRepository $orders;
    private ProductRepository $products;
    private PaymentTransactionRepository $paymentTransactions;
    private PromoCodeService $promoCodes;
    private CommissionService $commissions;

    public function __construct()
    {
        $this->orders = new OrderRepository();
        $this->products = new ProductRepository();
        $this->paymentTransactions = new PaymentTransactionRepository();
        $this->promoCodes = new PromoCodeService();
        $this->commissions = new CommissionService();
    }

    /**
     * @param array $order        orders row (column => value)
     * @param array<int, array{product_id:int,sku:string,name_en:string,name_ar:string,unit_price:float,quantity:int,line_total:float,pricing_type?:string,retail_unit_price?:float}> $lineItems
     * @param array<int, array{quantity:int,name_en:string}> $stockUpdates  product id => quantity to take
     * @param array{promo:array,sales_rep:array,base_amount:float,commission_amount:float}|null $promo
     * @param array|null $transaction payment_transactions row without order_id, or null when no money has moved yet
     * @param array{status:string,note:string} $history
     * @return int the new order id
     */
    public function place(array $order, array $lineItems, array $stockUpdates, ?array $promo, ?array $transaction, array $history): int
    {
        DatabaseManager::beginTransaction();
        try {
            $orderId = $this->write($order, $lineItems, $stockUpdates, $promo, $transaction, $history);
            DatabaseManager::commit();
        } catch (\Throwable $e) {
            DatabaseManager::rollBack();
            throw $e;
        }

        return $orderId;
    }

    /**
     * The same writes as place(), for a caller that already holds a transaction (quotation
     * conversion locks the quotation row first and must commit the order with it). Any
     * exception leaves the rollback to that caller.
     */
    public function write(array $order, array $lineItems, array $stockUpdates, ?array $promo, ?array $transaction, array $history): int
    {
        $orderId = $this->orders->create($order);

        if ($promo !== null) {
            // Atomic, guarded increment: if another checkout used the last remaining
            // use since the promo was validated, the whole order is abandoned.
            if (!$this->promoCodes->consumeUsage((int)$promo['promo']['id'])) {
                throw new DomainException('This promo code just reached its usage limit — please remove it and try again', 409);
            }
            $this->commissions->createForOrder(
                $orderId,
                (int)$promo['sales_rep']['id'],
                (int)$promo['promo']['id'],
                $promo['promo']['commission_type'],
                (float)$promo['promo']['commission_value'],
                $promo['promo']['commission_base'],
                $promo['base_amount'],
                $promo['commission_amount']
            );
        }

        foreach ($lineItems as $item) {
            DatabaseManager::query(
                "INSERT INTO order_items (order_id, product_id, sku, name_en, name_ar, unit_price, pricing_type, retail_unit_price, quantity, line_total)
                 VALUES (:order_id, :product_id, :sku, :name_en, :name_ar, :unit_price, :pricing_type, :retail_unit_price, :quantity, :line_total)",
                [
                    'order_id' => $orderId,
                    'product_id' => $item['product_id'],
                    'sku' => $item['sku'],
                    'name_en' => $item['name_en'],
                    'name_ar' => $item['name_ar'],
                    'unit_price' => $item['unit_price'],
                    'pricing_type' => $item['pricing_type'] ?? 'retail',
                    'retail_unit_price' => $item['retail_unit_price'] ?? $item['unit_price'],
                    'quantity' => $item['quantity'],
                    'line_total' => $item['line_total'],
                ]
            );
        }

        foreach ($stockUpdates as $productId => $update) {
            // Atomic, guarded decrement: closes the race where two checkouts both
            // read enough stock for the last unit.
            if (!$this->products->decrementStock((int)$productId, $update['quantity'])) {
                throw new DomainException(
                    "{$update['name_en']} sold out while we were placing your order — please remove it and try again",
                    409
                );
            }
        }

        if ($transaction !== null) {
            $this->paymentTransactions->create(['order_id' => $orderId] + $transaction);
        }

        $this->orders->addStatusHistory($orderId, $history['status'], $history['note'], null);

        return $orderId;
    }
}
