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
        return $order;
    }

    public function updateStatus(int $id, string $newStatus, ?string $note, ?string $cancellationReason, int $adminId): array
    {
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

        if ($newStatus === 'cancelled') {
            $reason = trim((string)($cancellationReason ?? ''));
            if ($reason === '') {
                throw new DomainException('A cancellation reason is required', 422);
            }
            $this->repo->update($id, ['status' => $newStatus, 'cancellation_reason' => $reason]);
        } else {
            $this->repo->update($id, ['status' => $newStatus]);
        }

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
}
