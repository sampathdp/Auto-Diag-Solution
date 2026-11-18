<?php

declare(strict_types=1);

namespace App\Services;

use App\Exceptions\DomainException;
use App\Repositories\AdminNoteRepository;
use App\Repositories\OrderRepository;
use App\Services\Fulfillment\FulfillmentService;

class OrderService
{
    private const VALID_STATUSES = [
        'pending', 'pending_vin_verification', 'paid', 'processing', 'shipped', 'delivered', 'cancelled', 'refunded',
    ];
    private const VALID_PAYMENT_STATUSES = ['pending', 'paid', 'failed', 'refunded'];
    // Once an order reaches one of these, it's done — no further status changes.
    private const TERMINAL_STATUSES = ['delivered', 'cancelled', 'refunded'];

    // The order status that marks a promo-linked order "complete" for commission
    // purposes — matches the existing terminal-state 'delivered' status/delivered_at hook.
    private const COMMISSION_COMPLETION_STATUS = 'delivered';

    private OrderRepository $repo;
    private AdminNoteRepository $notes;
    private FulfillmentService $fulfillment;
    private CommissionService $commissions;

    public function __construct()
    {
        $this->repo = new OrderRepository();
        $this->notes = new AdminNoteRepository();
        $this->fulfillment = new FulfillmentService();
        $this->commissions = new CommissionService();
    }

    public function list(array $filters, string $search, string $sortBy, string $sortDir, int $page, int $perPage, bool $withItems = false): array
    {
        $orders = $this->repo->paginate($filters, $search, $sortBy, $sortDir, $page, $perPage);

        if ($withItems) {
            $itemsByOrderId = $this->repo->itemsForOrderIds(array_column($orders, 'id'));
            foreach ($orders as &$order) {
                $order['items'] = $itemsByOrderId[$order['id']] ?? [];
            }
            unset($order);
        }

        return [
            'items' => $orders,
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

        // Awaiting VIN verification is a gate, not just another status: the only way out
        // of it (besides cancelling a bad order) is approveForFulfillment(), which is what
        // actually triggers the 3PL push. Otherwise an admin could drag the status straight
        // to "shipped" via the dropdown and skip the VIN check entirely.
        if ($order['status'] === 'pending_vin_verification' && !in_array($newStatus, ['pending_vin_verification', 'cancelled'], true)) {
            throw new DomainException(
                'This order is awaiting VIN verification. Use "Approve & Send to 3PL" once the VIN is confirmed, or cancel the order.',
                409
            );
        }

        $data = ['status' => $newStatus];

        if ($newStatus === 'cancelled') {
            $reason = trim((string)($cancellationReason ?? ''));
            if ($reason === '') {
                throw new DomainException('A cancellation reason is required', 422);
            }
            $data['cancellation_reason'] = $reason;
        }

        // Once an order is with Fulfillor, their warehouse ships it and the sync fills in
        // carrier/tracking — a hand-typed value would be overwritten or conflict.
        if (in_array($newStatus, ['processing', 'shipped'], true) && !empty($order['fulfillor_order_id']) && $order['status'] !== $newStatus) {
            throw new DomainException('This order is fulfilled by Fulfillor — shipping status and tracking come from the 3PL. Use "Sync Now" to refresh.', 409);
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

        // Stop the warehouse from shipping a cancelled order. Best-effort: the local
        // cancel stands either way; a failure is recorded on the order and in the
        // timeline so an admin can cancel it in Fulfillor by hand.
        if ($newStatus === 'cancelled' && !empty($order['fulfillor_order_id'])) {
            $cancelError = $this->fulfillment->cancelInFulfillor($id, $data['cancellation_reason'] ?? 'Cancelled');
            $this->repo->addStatusHistory(
                $id,
                'cancelled',
                $cancelError ?? 'Cancellation sent to Fulfillor.',
                $adminId
            );
        }

        // Promo-linked commission follows the order's own status, not a separate admin
        // click — see CommissionService::approveForOrder/cancelForOrder (both no-op if
        // this order never had a promo code, or its commission already moved past pending).
        if ($newStatus === self::COMMISSION_COMPLETION_STATUS) {
            $this->commissions->approveForOrder($id);
        } elseif (in_array($newStatus, ['cancelled', 'refunded'], true)) {
            $this->commissions->cancelForOrder($id);
        }

        return $this->find($id);
    }

    /**
     * Step 1 of leaving 'pending_vin_verification': an admin has checked the customer's
     * VIN/Mulkiya against the ordered parts and approves it, with an optional note. The
     * order stays in 'pending_vin_verification' — sending to the 3PL is a separate step
     * (step 2, approveForFulfillment). Can be re-run to edit the note before sending.
     */
    public function verifyVin(int $id, ?string $note, int $adminId): array
    {
        $order = $this->repo->find($id);
        if (!$order) {
            throw new DomainException('Order not found', 404);
        }
        if ($order['status'] !== 'pending_vin_verification') {
            throw new DomainException('Only orders awaiting VIN verification can have their VIN approved', 409);
        }

        $note = trim((string)($note ?? ''));
        if (mb_strlen($note) > 1000) {
            throw new DomainException('Note must be 1000 characters or less', 422);
        }

        $this->repo->update($id, [
            'vin_note' => $note !== '' ? $note : null,
            'vin_verified_at' => date('Y-m-d H:i:s'),
            'vin_verified_by' => $adminId,
        ]);
        $this->repo->addStatusHistory(
            $id,
            'pending_vin_verification',
            'VIN approved — ready to send to 3PL.' . ($note !== '' ? " Note: {$note}" : ''),
            $adminId
        );

        return $this->find($id);
    }

    /**
     * Step 2, the one way out of 'pending_vin_verification': the VIN has already been
     * verified (verifyVin), so it's now safe to hand off to Fulfillor. Moves the order to 'processing' and pushes it — same
     * best-effort push CheckoutService used to fire automatically at checkout, just gated
     * on this manual check now.
     */
    public function approveForFulfillment(int $id, int $adminId): array
    {
        $order = $this->repo->find($id);
        if (!$order) {
            throw new DomainException('Order not found', 404);
        }
        // A retry is allowed for an order that was already approved but never made it to
        // Fulfillor (push failed or was skipped, so no fulfillor_order_id was stored) —
        // otherwise a failed first push would leave the order stuck in 'processing' with
        // no way to resend it.
        $isRetry = $order['status'] === 'processing' && empty($order['fulfillor_order_id']);
        if ($order['status'] !== 'pending_vin_verification' && !$isRetry) {
            throw new DomainException('Only orders awaiting VIN verification (or approved orders not yet sent to the 3PL) can be sent for fulfillment', 409);
        }

        if (!$isRetry && empty($order['vin_verified_at'])) {
            throw new DomainException('Verify the VIN first, then send the order to the 3PL', 409);
        }

        if (!$isRetry) {
            $this->repo->update($id, ['status' => 'processing']);
            $this->repo->addStatusHistory($id, 'processing', 'Approved for fulfillment and sent to 3PL.', $adminId);
        }

        $this->fulfillment->pushOrder($id);

        return $this->find($id);
    }

    /**
     * Manual "Sync Now" — polls Fulfillor for this order's current status right away
     * instead of waiting for the next scheduled fulfillor:sync run or an incoming
     * webhook. Mainly useful for verifying the integration is actually wired up once
     * real credentials are in place.
     */
    public function syncFulfillmentStatus(int $id): array
    {
        if (!$this->repo->find($id)) {
            throw new DomainException('Order not found', 404);
        }
        $this->fulfillment->pullOrderStatus($id);
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

    /**
     * Flags an order for refund without changing payment_status — the actual money
     * movement still happens manually in the payment provider's dashboard until a real
     * gateway integration exists (see CheckoutService's docblock). This just gives the
     * admin panel's "Refund" button a real endpoint to call and a timestamped record of
     * the request, separate from `updatePaymentStatus('refunded')`, which is reserved
     * for confirming the refund actually completed.
     */
    public function requestRefund(int $id, int $adminId): array
    {
        $order = $this->repo->find($id);
        if (!$order) {
            throw new DomainException('Order not found', 404);
        }
        if ($order['refund_requested_at'] !== null || $order['payment_status'] === 'refunded') {
            throw new DomainException('A refund has already been requested for this order', 409);
        }

        $this->repo->update($id, ['refund_requested_at' => date('Y-m-d H:i:s')]);
        $this->notes->create('order', $id, $adminId, 'Refund requested — process the actual refund in the payment provider dashboard.');

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
