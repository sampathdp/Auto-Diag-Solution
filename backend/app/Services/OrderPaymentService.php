<?php

declare(strict_types=1);

namespace App\Services;

use App\Core\Database\DatabaseManager;
use App\Core\PrivateStorage;
use App\Exceptions\DomainException;
use App\Repositories\OrderPaymentProofRepository;
use App\Repositories\OrderRepository;
use App\Repositories\PaymentTransactionRepository;
use App\Services\B2B\PaymentMethodPolicy;

/**
 * Money arriving for an order after checkout: the buyer's bank transfer receipts, and
 * the admin confirming that a COD collection, bank transfer or cheque has actually been
 * received. Confirming writes exactly one payment_transactions row and marks the order
 * paid, inside a transaction that locks the order row, so two admins clicking at once
 * can't record the payment twice.
 */
class OrderPaymentService
{
    private const MAX_PROOFS_PER_ORDER = 5;
    private const CONFIRMABLE_METHODS = ['cod', 'bank_transfer', 'cheque'];
    private const UNPAID_STATUSES = ['pending', 'pending_verification'];
    private const CLOSED_ORDER_STATUSES = ['cancelled', 'refunded'];

    private OrderRepository $orders;
    private OrderPaymentProofRepository $proofs;
    private PaymentTransactionRepository $transactions;

    public function __construct()
    {
        $this->orders = new OrderRepository();
        $this->proofs = new OrderPaymentProofRepository();
        $this->transactions = new PaymentTransactionRepository();
    }

    public static function canUploadProof(array $order): bool
    {
        return ($order['payment_method'] ?? '') === 'bank_transfer'
            && ($order['payment_status'] ?? '') === 'pending_verification'
            && !in_array($order['status'] ?? '', self::CLOSED_ORDER_STATUSES, true);
    }

    /**
     * Stores a transfer receipt for an order the caller has already proven they own
     * (account JWT or the emailed tracking token).
     */
    public function uploadProof(array $order, ?array $file, ?int $uploadedBy): array
    {
        if (!self::canUploadProof($order)) {
            throw new DomainException('This order is not waiting for a bank transfer receipt', 409);
        }
        $orderId = (int)$order['id'];
        if ($this->proofs->countForOrder($orderId) >= self::MAX_PROOFS_PER_ORDER) {
            throw new DomainException('You have already uploaded ' . self::MAX_PROOFS_PER_ORDER . ' receipts for this order. Contact us if you need to send another.', 422);
        }

        try {
            $stored = PrivateStorage::store($file ?? [], 'payment-proofs/' . $orderId);
        } catch (DomainException $e) {
            throw $e;
        } catch (\Exception $e) {
            // Bad type, upload error: the uploader's message is safe to show.
            throw new DomainException($e->getMessage(), 422);
        }
        if ($stored === null) {
            throw new DomainException('Choose a receipt to upload (JPG, PNG, WebP or PDF)', 422);
        }

        try {
            $this->proofs->create([
                'order_id' => $orderId,
                'storage_key' => $stored['key'],
                'original_name' => $stored['original_name'],
                'mime_type' => $stored['mime'],
                'size_bytes' => $stored['size'],
                'sha256' => $stored['sha256'],
                'uploaded_by' => $uploadedBy,
            ]);
        } catch (\Throwable $e) {
            PrivateStorage::delete($stored['key']);
            throw $e;
        }

        $this->orders->addStatusHistory($orderId, (string)$order['status'], 'Bank transfer receipt uploaded by the customer.', $uploadedBy);

        return $this->proofs->forOrder($orderId);
    }

    public function proofsFor(int $orderId): array
    {
        return array_map(fn (array $p) => [
            'id' => (int)$p['id'],
            'original_name' => $p['original_name'],
            'mime_type' => $p['mime_type'],
            'size_bytes' => (int)$p['size_bytes'],
            'created_at' => $p['created_at'],
        ], $this->proofs->forOrder($orderId));
    }

    /** Admin only; the route checks the permission. Ends the request. */
    public function streamProof(int $orderId, int $proofId): never
    {
        $proof = $this->proofs->findForOrder($orderId, $proofId);
        if (!$proof) {
            throw new DomainException('Receipt not found', 404);
        }
        PrivateStorage::stream((string)$proof['storage_key'], (string)$proof['original_name']);
    }

    public function transactionsFor(int $orderId): array
    {
        return array_map(fn (array $t) => [
            'id' => (int)$t['id'],
            'provider' => $t['provider'],
            'provider_reference' => $t['provider_reference'],
            'type' => $t['type'],
            'status' => $t['status'],
            'amount' => (float)$t['amount'],
            'currency' => $t['currency'],
            'created_at' => $t['created_at'],
        ], DatabaseManager::query(
            "SELECT * FROM payment_transactions WHERE order_id = :id ORDER BY created_at ASC, id ASC",
            ['id' => $orderId]
        )->fetchAll());
    }

    /**
     * "Mark COD collected", "Verify bank transfer" or "Mark cheque cleared".
     * $reference: the bank's transaction reference (required for transfers), the cheque
     * number (required for cheques), or optional for COD (a receipt number, say).
     */
    public function confirm(int $orderId, int $adminId, ?string $reference, ?string $note): void
    {
        $reference = trim((string)$reference);
        $note = trim((string)$note);
        if (mb_strlen($reference) > 100) {
            throw new DomainException('Reference must be 100 characters or less', 422);
        }
        if (mb_strlen($note) > 500) {
            throw new DomainException('Note must be 500 characters or less', 422);
        }

        DatabaseManager::beginTransaction();
        try {
            $order = DatabaseManager::query("SELECT * FROM orders WHERE id = :id FOR UPDATE", ['id' => $orderId])->fetch();
            if (!$order) {
                throw new DomainException('Order not found', 404);
            }
            $method = (string)$order['payment_method'];
            if (!in_array($method, self::CONFIRMABLE_METHODS, true)) {
                throw new DomainException('This order was not paid by cash on delivery, bank transfer or cheque', 409);
            }
            if (!in_array($order['payment_status'], self::UNPAID_STATUSES, true)) {
                throw new DomainException("Payment is already {$order['payment_status']} for this order", 409);
            }
            if (in_array($order['status'], self::CLOSED_ORDER_STATUSES, true)) {
                throw new DomainException("This order is {$order['status']}; its payment can't be confirmed", 409);
            }

            if ($reference === '' && $method === 'bank_transfer') {
                throw new DomainException("Enter the bank's transaction reference from your statement", 422);
            }
            if ($reference === '' && $method === 'cheque') {
                throw new DomainException('Enter the cheque number', 422);
            }
            // COD has no outside reference; the order number keeps the row unique.
            $providerReference = $reference !== '' ? $reference : 'COD-' . $order['order_number'];

            try {
                $this->transactions->create([
                    'order_id' => $orderId,
                    'provider' => $method,
                    'provider_reference' => $providerReference,
                    'type' => 'payment',
                    'status' => 'succeeded',
                    'amount' => $order['total'],
                    'currency' => $order['currency'],
                    'raw_payload' => json_encode(['confirmed_by' => $adminId, 'note' => $note !== '' ? $note : null], JSON_UNESCAPED_UNICODE),
                ]);
            } catch (\PDOException $e) {
                if ((string)$e->getCode() === '23000') {
                    throw new DomainException('That reference is already recorded against another payment. Check it and try again.', 409);
                }
                throw $e;
            }

            $this->orders->update($orderId, ['payment_status' => 'paid']);

            $what = match ($method) {
                'cod' => 'Cash on delivery collected',
                'bank_transfer' => 'Bank transfer verified',
                'cheque' => 'Cheque cleared',
            };
            $this->orders->addStatusHistory(
                $orderId,
                (string)$order['status'],
                $what . ($reference !== '' ? " (ref {$reference})" : '') . '.' . ($note !== '' ? " Note: {$note}" : ''),
                $adminId
            );

            DatabaseManager::commit();
        } catch (\Throwable $e) {
            DatabaseManager::rollBack();
            throw $e;
        }

        AdminActivityLogger::log($adminId, 'order.payment_confirmed', 'order', $orderId, [
            'method' => $method,
            'reference' => $providerReference,
            'amount' => (float)$order['total'],
        ]);
    }

    /** Bank details and the reference to quote, while a bank transfer is still awaited. */
    public static function instructionsFor(array $order): ?array
    {
        if (!self::canUploadProof($order)) {
            return null;
        }
        return (new PaymentMethodPolicy())->bankTransferDetails((string)$order['order_number']);
    }
}
