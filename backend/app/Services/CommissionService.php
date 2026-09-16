<?php

declare(strict_types=1);

namespace App\Services;

use App\Core\Database\DatabaseManager;
use App\Exceptions\DomainException;
use App\Repositories\CommissionPaymentRepository;
use App\Repositories\CommissionRepository;

class CommissionService
{
    private const PAYMENT_METHODS = ['bank_transfer', 'cash', 'other'];

    private CommissionRepository $repo;
    private CommissionPaymentRepository $payments;

    public function __construct()
    {
        $this->repo = new CommissionRepository();
        $this->payments = new CommissionPaymentRepository();
    }

    public function list(array $filters, string $sortBy, string $sortDir, int $page, int $perPage): array
    {
        return [
            'items' => $this->repo->paginate($filters, $sortBy, $sortDir, $page, $perPage),
            'total' => $this->repo->countFiltered($filters),
        ];
    }

    public function find(int $id): array
    {
        $commission = $this->repo->findDetailed($id);
        if (!$commission) {
            throw new DomainException('Commission not found', 404);
        }
        return $commission;
    }

    public function dashboard(): array
    {
        return $this->repo->dashboardTotals();
    }

    /**
     * Called from inside CheckoutService's own order-placement transaction — this is a
     * plain insert, not its own transaction, so a later failure in the same checkout
     * (e.g. the stock decrement) rolls the commission row back along with the order.
     */
    public function createForOrder(
        int $orderId,
        int $salesRepId,
        ?int $promoCodeId,
        string $commissionType,
        float $commissionValue,
        string $commissionBase,
        float $baseAmount,
        float $commissionAmount
    ): int {
        return $this->repo->create([
            'order_id' => $orderId,
            'sales_rep_id' => $salesRepId,
            'promo_code_id' => $promoCodeId,
            'commission_type' => $commissionType,
            'commission_value' => $commissionValue,
            'commission_base' => $commissionBase,
            'base_amount' => $baseAmount,
            'commission_amount' => $commissionAmount,
            'status' => 'pending',
        ]);
    }

    /** Order reached its completion status — pending becomes approved. No-op if there's no commission or it's already past pending. */
    public function approveForOrder(int $orderId): void
    {
        $commission = $this->repo->findByOrderId($orderId);
        if (!$commission || $commission['status'] !== 'pending') {
            return;
        }
        $this->repo->update((int)$commission['id'], [
            'status' => 'approved',
            'approved_at' => date('Y-m-d H:i:s'),
        ]);
    }

    /** Order was cancelled/refunded — voids the commission unless it's already been paid out. */
    public function cancelForOrder(int $orderId): void
    {
        $commission = $this->repo->findByOrderId($orderId);
        if (!$commission || in_array($commission['status'], ['paid', 'cancelled'], true)) {
            return;
        }
        $this->repo->update((int)$commission['id'], ['status' => 'cancelled']);
    }

    public function approve(int $id): array
    {
        $commission = $this->repo->find($id);
        if (!$commission) {
            throw new DomainException('Commission not found', 404);
        }
        if ($commission['status'] !== 'pending') {
            throw new DomainException("Only a pending commission can be approved (this one is {$commission['status']})", 409);
        }
        $this->repo->update($id, ['status' => 'approved', 'approved_at' => date('Y-m-d H:i:s')]);
        return $this->find($id);
    }

    /**
     * Records a payment and flips the commission to 'paid' in one transaction. The
     * UNIQUE(commission_id) index on commission_payments is the actual double-payment
     * guard (a second insert for the same commission_id fails at the DB level even
     * under a race) — the status check here just gives a clean 409 first.
     */
    public function pay(int $id, string $method, ?string $reference, ?string $paymentDate, ?string $notes): array
    {
        $commission = $this->repo->find($id);
        if (!$commission) {
            throw new DomainException('Commission not found', 404);
        }
        if ($commission['status'] === 'paid') {
            throw new DomainException('This commission has already been paid', 409);
        }
        if ($commission['status'] !== 'approved') {
            throw new DomainException('Only an approved commission can be paid', 409);
        }
        if (!in_array($method, self::PAYMENT_METHODS, true)) {
            throw new DomainException('Invalid payment method', 422);
        }

        DatabaseManager::beginTransaction();
        try {
            $this->payments->create([
                'sales_rep_id' => (int)$commission['sales_rep_id'],
                'commission_id' => $id,
                'amount' => (float)$commission['commission_amount'],
                'payment_method' => $method,
                'payment_reference' => $reference !== null && $reference !== '' ? $reference : null,
                'payment_date' => $paymentDate !== null && $paymentDate !== '' ? $paymentDate : date('Y-m-d'),
                'notes' => $notes !== null && $notes !== '' ? $notes : null,
            ]);
            $this->repo->update($id, ['status' => 'paid', 'paid_at' => date('Y-m-d H:i:s')]);
            DatabaseManager::commit();
        } catch (\Throwable $e) {
            DatabaseManager::rollBack();
            // A UNIQUE(commission_id) violation lands here if two "pay" requests raced
            // past the status check above at the same instant — anything else is a real
            // failure and should surface as one (caught by the global handler), not be
            // silently relabeled as "already paid".
            if ($e instanceof \PDOException && $e->getCode() === '23000') {
                throw new DomainException('This commission has already been paid', 409);
            }
            throw $e;
        }

        return $this->find($id);
    }
}
