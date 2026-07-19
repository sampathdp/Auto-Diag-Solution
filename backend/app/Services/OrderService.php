<?php

declare(strict_types=1);

namespace App\Services;

use App\Exceptions\DomainException;
use App\Repositories\AdminNoteRepository;
use App\Repositories\OrderRepository;

class OrderService
{
    private const VALID_STATUSES = ['pending', 'paid', 'processing', 'shipped', 'delivered', 'cancelled', 'refunded'];
    private const VALID_PAYMENT_STATUSES = ['pending', 'paid', 'failed', 'refunded'];
    // Once an order reaches one of these, it's done — no further status changes.
    private const TERMINAL_STATUSES = ['delivered', 'cancelled', 'refunded'];

    private OrderRepository $repo;
    private AdminNoteRepository $notes;

    public function __construct()
    {
        $this->repo = new OrderRepository();
        $this->notes = new AdminNoteRepository();
    }

    public function list(array $filters, string $search, string $sortBy, string $sortDir, int $page, int $perPage): array
    {
        return [
            'items' => $this->repo->paginate($filters, $search, $sortBy, $sortDir, $page, $perPage),
            'total' => $this->repo->countFiltered($filters, $search),
        ];
    }

    public function find(int $id): array
    {
        $order = $this->repo->findWithCustomer($id);
        if (!$order) {
            throw new DomainException('Order not found', 404);
        }
        $order['items'] = $this->repo->items($id);
        $order['status_history'] = $this->repo->statusHistory($id);
        $order['internal_notes'] = $this->notes->forEntity('order', $id);
        $order['shipping_snapshot'] = $this->decodeShippingSnapshot($order['shipping_snapshot'] ?? null);
        return $order;
    }

    /**
     * Ships/cancels/otherwise transitions an order. There's no live courier API yet, so
     * "shipping" is a manual admin action: picking a carrier and typing in the tracking
     * number/label reference. That's required the moment $newStatus is 'shipped'.
     */
    public function updateStatus(
        int $id,
        string $newStatus,
        ?string $note,
        ?string $cancellationReason,
        int $adminId,
        ?string $carrier = null,
        ?string $trackingNumber = null
    ): array {
        $order = $this->repo->find($id);
        if (!$order) {
            throw new DomainException('Order not found', 404);
        }

        if (!in_array($newStatus, self::VALID_STATUSES, true)) {
            throw new DomainException('Invalid order status', 422);
        }

        if (in_array($order['status'], self::TERMINAL_STATUSES, true) && $order['status'] !== $newStatus) {
            throw new DomainException("Order is already {$order['status']} and cannot be changed further", 409);
        }

        $data = ['status' => $newStatus];

        if ($newStatus === 'cancelled') {
            $reason = trim((string)($cancellationReason ?? ''));
            if ($reason === '') {
                throw new DomainException('A cancellation reason is required', 422);
            }
            $data['cancellation_reason'] = $reason;
        }

        if ($newStatus === 'shipped') {
            $carrier = trim((string)($carrier ?? ''));
            $trackingNumber = trim((string)($trackingNumber ?? ''));
            if ($carrier === '' || $trackingNumber === '') {
                throw new DomainException('A carrier and tracking number are required to mark an order as shipped', 422);
            }
            $data['carrier'] = $carrier;
            $data['tracking_number'] = $trackingNumber;
            if (!$order['shipped_at']) {
                $data['shipped_at'] = date('Y-m-d H:i:s');
            }
            $note = trim(($note ? $note . ' — ' : '') . "Shipped via {$carrier}, tracking #{$trackingNumber}.");
        }

        if ($newStatus === 'delivered' && !$order['delivered_at']) {
            $data['delivered_at'] = date('Y-m-d H:i:s');
        }

        $this->repo->update($id, $data);
        $this->repo->addStatusHistory($id, $newStatus, $note, $adminId);

        return $this->find($id);
    }

    public function updatePaymentStatus(int $id, string $newPaymentStatus, int $adminId): array
    {
        $order = $this->repo->find($id);
        if (!$order) {
            throw new DomainException('Order not found', 404);
        }
        if (!in_array($newPaymentStatus, self::VALID_PAYMENT_STATUSES, true)) {
            throw new DomainException('Invalid payment status', 422);
        }

        $data = ['payment_status' => $newPaymentStatus];
        if ($newPaymentStatus === 'refunded' && $order['refund_requested_at'] === null) {
            $data['refund_requested_at'] = date('Y-m-d H:i:s');
        }
        $this->repo->update($id, $data);
        $this->notes->create('order', $id, $adminId, "Payment status changed to {$newPaymentStatus}");

        return $this->find($id);
    }

    public function addNote(int $id, string $note, int $adminId): array
    {
        if (!$this->repo->find($id)) {
            throw new DomainException('Order not found', 404);
        }
        $note = trim($note);
        if ($note === '') {
            throw new DomainException('Note cannot be empty', 422);
        }
        $this->notes->create('order', $id, $adminId, $note);
        return $this->find($id);
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
