<?php

declare(strict_types=1);

namespace App\Services\B2B;

use App\Core\Database\DatabaseManager;
use App\Exceptions\DomainException;
use App\Exceptions\ValidationException;
use App\Repositories\DealerProfileRepository;
use App\Repositories\ProductRepository;
use App\Repositories\QuotationRepository;
use App\Repositories\UserRepository;
use App\Services\AccountOrderService;
use App\Services\AdminActivityLogger;
use App\Services\CheckoutService;
use App\Services\OrderTotals;
use App\Services\RateLimiter;
use App\Services\SettingService;

/**
 * Dealer quotations (INTEGRATION_ARCHITECTURE.md §4).
 *
 * Lifecycle: submitted → under_review → (discussion_required | revised)* → approved
 * → dealer accepts → converted. The dealer can withdraw an open request (cancelled) or
 * decline an offer (rejected); an admin can reject at any open stage; an approved offer
 * the dealer hasn't accepted expires at expires_at (cron, and lazily on read/accept).
 *
 * Every state change locks the quotation row (SELECT ... FOR UPDATE) and checks the
 * current status inside the transaction, so parallel clicks can't both act. Conversion
 * places the order inside that same transaction; UNIQUE(orders.quotation_id) and
 * UNIQUE(converted_order_id) are the backstop, and a repeated accept returns the order
 * already created. Emails go out only after the commit.
 *
 * Items always hold the current version. Every version, v1 included, is also frozen as a
 * snapshot in dealer_quotation_versions, so a revision never loses what the dealer saw.
 */
final class QuotationService
{
    /** A dealer can't have more than this many quotations in progress at once. */
    private const MAX_OPEN_PER_DEALER = 10;
    private const MAX_LINES = 100;
    private const MESSAGE_MAX = 2000;

    /** Status the admin may revise from; approving again is needed afterwards. */
    private const REVISABLE = ['submitted', 'under_review', 'discussion_required', 'revised', 'approved'];
    /** Status the admin may approve from. */
    private const APPROVABLE = ['submitted', 'under_review', 'discussion_required', 'revised'];

    private QuotationRepository $repo;
    private DealerProfileRepository $profiles;
    private ProductRepository $products;
    private UserRepository $users;
    private SettingService $settings;
    private PaymentMethodPolicy $paymentPolicy;
    private QuotationMailer $mailer;

    public function __construct()
    {
        $this->repo = new QuotationRepository();
        $this->profiles = new DealerProfileRepository();
        $this->products = new ProductRepository();
        $this->users = new UserRepository();
        $this->settings = new SettingService();
        $this->paymentPolicy = new PaymentMethodPolicy();
        $this->mailer = new QuotationMailer();
    }

    // ------------------------------------------------------------------ creation

    /**
     * Called by CheckoutService for a dealer who needs a quotation. The lines are already
     * priced (wholesale where it applies) and checked for availability; nothing is taken
     * from stock and nothing is charged.
     *
     * @param array<int, array{product_id:int,sku:string,name_en:string,name_ar:string,unit_price:float,retail_unit_price:float,quantity:int,line_total:float,vat_inclusive:bool,free_shipping:bool}> $lineItems
     */
    public function createFromCheckout(
        array $profile,
        int $userId,
        ?int $shippingAddressId,
        array $address,
        array $lineItems,
        float $shipping,
        string $paymentMethod
    ): array {
        if (count($lineItems) > self::MAX_LINES) {
            throw new DomainException('A quotation can have at most ' . self::MAX_LINES . ' lines', 422);
        }
        $profileId = (int)$profile['id'];
        if ($this->repo->countOpenForDealer($profileId) >= self::MAX_OPEN_PER_DEALER) {
            throw new DomainException(
                'You already have ' . self::MAX_OPEN_PER_DEALER . ' quotations in progress. Accept, withdraw or wait for one of them before sending another.',
                429
            );
        }

        $totals = $this->totals($lineItems, $shipping, 0.0);
        $number = $this->generateNumber();
        $isFirst = empty($profile['first_order_completed_at']) ? 1 : 0;

        DatabaseManager::beginTransaction();
        try {
            $id = $this->repo->create([
                'quotation_number' => $number,
                'dealer_profile_id' => $profileId,
                'user_id' => $userId,
                'status' => 'submitted',
                'current_version' => 1,
                'subtotal' => $totals['subtotal'],
                'discount_amount' => 0,
                'shipping_amount' => $shipping,
                'vat_rate' => OrderTotals::VAT_RATE,
                'vat_amount' => $totals['vat'],
                'total' => $totals['total'],
                'currency' => 'AED',
                'payment_method_pref' => $paymentMethod,
                'shipping_address_id' => $shippingAddressId,
                'shipping_snapshot' => json_encode($address, JSON_UNESCAPED_UNICODE),
                'is_first_order' => $isFirst,
                'submitted_at' => date('Y-m-d H:i:s'),
            ]);
            $this->repo->replaceItems($id, $lineItems);
            $quotation = $this->repo->find($id);
            $this->repo->addVersion($id, 1, $this->snapshot($quotation, $this->repo->items($id)), 'Submitted by the dealer', $userId);
            DatabaseManager::commit();
        } catch (\Throwable $e) {
            DatabaseManager::rollBack();
            throw $e;
        }

        $this->mailer->submitted($quotation, $this->repo->items($id), $profile, $this->userOf($userId));
        return $this->dealerShape($quotation, $profile);
    }

    // ------------------------------------------------------------------ dealer side

    public function listForDealer(int $userId, string $status, int $page, int $perPage): array
    {
        $profile = DealerContext::profileFor($userId);
        $perPage = min(50, max(1, $perPage));
        if (!$profile) {
            return ['items' => [], 'meta' => $this->meta(0, 1, $perPage), 'counts' => []];
        }
        $this->expireOverdue((int)$profile['id']);
        $result = $this->repo->paginateForDealer((int)$profile['id'], $status, max(1, $page), $perPage);
        return [
            'items' => $result['items'],
            'meta' => $this->meta($result['total'], max(1, $page), $perPage),
            'counts' => $this->repo->statusCounts((int)$profile['id']),
        ];
    }

    public function showForDealer(int $userId, int $id): array
    {
        [$quotation, $profile] = $this->ownQuotation($userId, $id);
        return $this->dealerShape($quotation, $profile);
    }

    public function dealerMessage(int $userId, int $id, string $body): array
    {
        $body = $this->cleanMessage($body);
        if (!RateLimiter::allow('quotation-message', (string)$userId, 30, 3600)) {
            throw new DomainException('Too many messages. Try again in a while.', 429);
        }
        [, $profile] = $this->ownQuotation($userId, $id);

        $q = $this->inTransaction($id, function (array $locked) use ($userId, $body) {
            $this->assertStatus($locked, QuotationRepository::OPEN_STATUSES, 'send a message');
            $this->repo->addMessage((int)$locked['id'], $userId, 'dealer', 'dealer', $body);
            // The dealer answered the team's question, so it's back with the team.
            if ($locked['status'] === 'discussion_required') {
                $this->repo->update((int)$locked['id'], ['status' => 'under_review']);
            }
        });

        $this->mailer->dealerReplied($q, $profile, $body);
        return $this->dealerShape($q, $profile);
    }

    /**
     * Dealer declines: an approved or revised offer becomes 'rejected'; a request still
     * with the team becomes 'cancelled' (withdrawn).
     */
    public function dealerReject(int $userId, int $id, ?string $reason): array
    {
        $reason = trim((string)$reason);
        if (mb_strlen($reason) > self::MESSAGE_MAX) {
            throw new ValidationException(['reason' => ['Keep the reason under ' . self::MESSAGE_MAX . ' characters.']]);
        }
        [, $profile] = $this->ownQuotation($userId, $id);

        $withdrawn = false;
        $q = $this->inTransaction($id, function (array $locked) use ($userId, $reason, &$withdrawn) {
            $this->assertStatus($locked, QuotationRepository::OPEN_STATUSES, 'decline it');
            $withdrawn = !in_array($locked['status'], ['approved', 'revised'], true);
            $this->repo->update((int)$locked['id'], [
                'status' => $withdrawn ? 'cancelled' : 'rejected',
                'rejection_reason' => $reason !== '' ? $reason : null,
                'rejected_by_role' => 'dealer',
            ]);
            $this->repo->addMessage(
                (int)$locked['id'],
                $userId,
                'system',
                'dealer',
                ($withdrawn ? 'Withdrawn by the dealer.' : 'Declined by the dealer.') . ($reason !== '' ? " Reason: {$reason}" : '')
            );
        });

        $this->mailer->dealerDeclined($q, $profile, $reason !== '' ? $reason : null, $withdrawn);
        return $this->dealerShape($q, $profile);
    }

    /**
     * Dealer accepts an approved quotation: the order is placed at the quoted prices in
     * the same transaction (exactly once). A repeated call returns the order already
     * placed.
     *
     * @return array{quotation: array, order: array, already_converted: bool}
     */
    public function accept(int $userId, int $id, ?string $paymentMethod): array
    {
        [, $profile] = $this->ownQuotation($userId, $id);
        $checkout = new CheckoutService();
        $placement = new OrderPlacementService();

        $alreadyConverted = false;
        $orderId = null;
        $orderNumber = null;
        $method = null;

        DatabaseManager::beginTransaction();
        try {
            $q = $this->repo->lock($id);
            if (!$q || (int)$q['dealer_profile_id'] !== (int)$profile['id']) {
                throw new DomainException('Quotation not found', 404);
            }

            if ($q['status'] === 'converted' && $q['converted_order_id'] !== null) {
                $alreadyConverted = true;
                $orderId = (int)$q['converted_order_id'];
            } else {
                if ($q['status'] === 'approved' && $this->isPastExpiry($q)) {
                    $this->repo->update($id, ['status' => 'expired']);
                    $this->repo->addMessage($id, null, 'system', 'dealer', 'The offer expired before it was accepted.');
                    DatabaseManager::commit();
                    throw new DomainException('This quotation has expired. Send a new request from your cart, or ask us to renew it.', 409);
                }
                $this->assertStatus($q, ['approved'], 'accept it');

                // The dealer's standing is checked again now, not when the offer was made.
                $lockedProfile = $this->profiles->lock((int)$profile['id']);
                if (!DealerContext::isActiveDealer($lockedProfile)) {
                    throw new DomainException('Your dealer account is not active, so the quotation cannot be accepted. Please contact us.', 403);
                }

                $method = trim((string)($paymentMethod ?? '')) ?: (string)$q['payment_method_pref'];
                $this->paymentPolicy->assertAllowed($method, PaymentMethodPolicy::CHANNEL_B2B);

                $items = $this->repo->items($id);
                [$lineItems, $stockUpdates] = $this->orderLines($items);

                $orderNumber = $checkout->generateOrderNumber();
                $orderId = $placement->write(
                    [
                        'order_number' => $orderNumber,
                        'user_id' => (int)$q['user_id'],
                        'channel' => PaymentMethodPolicy::CHANNEL_B2B,
                        'dealer_profile_id' => (int)$profile['id'],
                        'quotation_id' => $id,
                        'status' => 'pending_vin_verification',
                        'payment_status' => PaymentMethodPolicy::initialStatus($method),
                        'payment_method' => $method,
                        'payment_reference' => $method === 'bank_transfer' ? $orderNumber : null,
                        'subtotal' => $q['subtotal'],
                        'vat_rate' => $q['vat_rate'],
                        'vat_amount' => $q['vat_amount'],
                        'shipping_amount' => $q['shipping_amount'],
                        'discount_amount' => $q['discount_amount'],
                        'commission_amount' => 0,
                        'total' => $q['total'],
                        'currency' => $q['currency'],
                        'shipping_address_id' => $q['shipping_address_id'],
                        'shipping_snapshot' => $q['shipping_snapshot'],
                    ],
                    $lineItems,
                    $stockUpdates,
                    null,
                    null,
                    [
                        'status' => 'pending_vin_verification',
                        'note' => "Order placed from quotation {$q['quotation_number']} (version {$q['current_version']}). "
                            . CheckoutService::placedNote($method) . ' Held for VIN verification before being sent to the 3PL.',
                    ]
                );

                $now = date('Y-m-d H:i:s');
                $this->repo->update($id, [
                    'status' => 'converted',
                    'payment_method_pref' => $method,
                    'dealer_accepted_at' => $now,
                    'converted_order_id' => $orderId,
                    'converted_at' => $now,
                ]);
                DatabaseManager::query(
                    "UPDATE dealer_profiles SET first_order_completed_at = COALESCE(first_order_completed_at, NOW()) WHERE id = :id",
                    ['id' => (int)$profile['id']]
                );
                $this->repo->addMessage($id, $userId, 'system', 'dealer', "Accepted by the dealer and placed as order {$orderNumber}.");
            }
            DatabaseManager::commit();
        } catch (\Throwable $e) {
            if (DatabaseManager::connect()->inTransaction()) {
                DatabaseManager::rollBack();
            }
            throw $e;
        }

        DealerContext::forget($userId);
        $quotation = $this->repo->find($id);

        if (!$alreadyConverted) {
            $order = (new \App\Repositories\OrderRepository())->find($orderId);
            $checkout->sendConfirmationEmail(
                (int)$quotation['user_id'],
                $orderId,
                (string)$orderNumber,
                (float)$quotation['total'],
                $lineItems ?? [],
                (string)$method
            );
            $this->mailer->converted($quotation, $profile, (string)($order['order_number'] ?? $orderNumber), $orderId);
        }

        return [
            'quotation' => $this->dealerShape($quotation, DealerContext::profileFor($userId) ?? $profile),
            'order' => (new AccountOrderService())->show((int)$quotation['user_id'], $orderId),
            'already_converted' => $alreadyConverted,
        ];
    }

    // ------------------------------------------------------------------ admin side

    public function adminList(string $status, string $search, ?int $dealerId, int $page, int $perPage): array
    {
        $this->expireOverdue(null);
        $perPage = min(100, max(1, $perPage));
        $result = $this->repo->adminPaginate($status, trim($search), $dealerId, max(1, $page), $perPage);
        return [
            'items' => $result['items'],
            'meta' => $this->meta($result['total'], max(1, $page), $perPage),
            'counts' => $this->repo->statusCounts($dealerId),
        ];
    }

    public function adminShow(int $id): array
    {
        $q = $this->repo->find($id);
        if (!$q) {
            throw new DomainException('Quotation not found', 404);
        }
        $q = $this->expireIfDue($q);
        return $this->adminShape($q);
    }

    public function startReview(int $id, int $adminId): array
    {
        $this->inTransaction($id, function (array $locked) use ($adminId) {
            $this->assertStatus($locked, ['submitted'], 'start the review');
            $this->repo->update((int)$locked['id'], ['status' => 'under_review']);
            AdminActivityLogger::log($adminId, 'quotation.under_review', 'quotation', (int)$locked['id']);
        });
        return $this->adminShow($id);
    }

    /**
     * @param array{body?:string, visibility?:string, request_reply?:bool} $input
     */
    public function adminMessage(int $id, int $adminId, array $input): array
    {
        $body = $this->cleanMessage((string)($input['body'] ?? ''));
        $visibility = ($input['visibility'] ?? 'dealer') === 'internal' ? 'internal' : 'dealer';
        $requestReply = $visibility === 'dealer' && filter_var($input['request_reply'] ?? false, FILTER_VALIDATE_BOOLEAN);

        $q = $this->inTransaction($id, function (array $locked) use ($adminId, $body, $visibility, $requestReply) {
            if ($visibility === 'dealer') {
                $this->assertStatus($locked, QuotationRepository::OPEN_STATUSES, 'message the dealer');
            }
            $this->repo->addMessage((int)$locked['id'], $adminId, 'admin', $visibility, $body);
            $next = null;
            if ($requestReply && $locked['status'] !== 'approved') {
                $next = 'discussion_required';
            } elseif ($visibility === 'dealer' && $locked['status'] === 'submitted') {
                $next = 'under_review';
            }
            if ($next !== null && $next !== $locked['status']) {
                $this->repo->update((int)$locked['id'], ['status' => $next]);
            }
            AdminActivityLogger::log($adminId, 'quotation.message', 'quotation', (int)$locked['id'], [
                'visibility' => $visibility,
                'request_reply' => $requestReply,
            ]);
        });

        if ($visibility === 'dealer') {
            $this->mailer->messageToDealer($q, $this->profileOf($q), $this->userOf((int)$q['user_id']), $body, $requestReply);
        }
        return $this->adminShape($q);
    }

    /**
     * New version: lines (quantity and unit price per product), shipping, discount and
     * expiry. The previous version stays in dealer_quotation_versions. An approved
     * quotation goes back to 'revised' and needs approving again.
     *
     * @param array{items?:array, shipping_amount?:mixed, discount_amount?:mixed, expires_at?:?string, reason?:string, message?:?string} $input
     */
    public function revise(int $id, int $adminId, array $input): array
    {
        $errors = [];
        $reason = trim((string)($input['reason'] ?? ''));
        if (mb_strlen($reason) < 3 || mb_strlen($reason) > 1000) {
            $errors['reason'] = ['Say what changed (3 to 1000 characters). The dealer sees this with the new version.'];
        }
        $message = trim((string)($input['message'] ?? ''));
        if (mb_strlen($message) > self::MESSAGE_MAX) {
            $errors['message'] = ['Keep the message under ' . self::MESSAGE_MAX . ' characters.'];
        }
        $shipping = $this->money($input['shipping_amount'] ?? 0, 'shipping_amount', 'shipping', $errors, 0.0, 100000.0);
        $discount = $this->money($input['discount_amount'] ?? 0, 'discount_amount', 'discount', $errors, 0.0, 10000000.0);
        $expiresAt = $this->cleanExpiry($input['expires_at'] ?? null, $errors);
        $lines = $this->cleanLines($input['items'] ?? null, $errors);
        if (!$errors && $lines) {
            $lineTotals = OrderTotals::lines($lines);
            if ($discount > $lineTotals['subtotal']) {
                $errors['discount_amount'] = ['The discount can\'t be more than the subtotal before VAT (AED ' . number_format($lineTotals['subtotal'], 2) . ').'];
            }
        }
        if ($errors) {
            throw new ValidationException($errors);
        }

        $totals = $this->totals($lines, $shipping, $discount);
        $q = $this->inTransaction($id, function (array $locked) use ($adminId, $lines, $totals, $shipping, $discount, $expiresAt, $reason, $message) {
            $this->assertStatus($locked, self::REVISABLE, 'revise it');
            $qid = (int)$locked['id'];
            $version = (int)$locked['current_version'] + 1;
            $this->repo->replaceItems($qid, $lines);
            $this->repo->update($qid, [
                'status' => 'revised',
                'current_version' => $version,
                'subtotal' => $totals['subtotal'],
                'discount_amount' => $discount,
                'shipping_amount' => $shipping,
                'vat_amount' => $totals['vat'],
                'total' => $totals['total'],
                'expires_at' => $expiresAt ?? $locked['expires_at'],
                // A changed offer needs a fresh approval.
                'approved_by' => null,
                'approved_at' => null,
                'expiry_reminder_sent_at' => null,
            ]);
            $fresh = $this->repo->find($qid);
            $this->repo->addVersion($qid, $version, $this->snapshot($fresh, $this->repo->items($qid)), $reason, $adminId);
            $this->repo->addMessage($qid, $adminId, 'system', 'dealer', "Version {$version}: {$reason}");
            if ($message !== '') {
                $this->repo->addMessage($qid, $adminId, 'admin', 'dealer', $message);
            }
            AdminActivityLogger::log($adminId, 'quotation.revised', 'quotation', $qid, [
                'version' => $version,
                'from_total' => $locked['total'],
                'to_total' => $totals['total'],
                'reason' => $reason,
            ]);
        });

        $this->mailer->revised($q, $this->profileOf($q), $this->userOf((int)$q['user_id']), $message !== '' ? $message : $reason);
        return $this->adminShape($q);
    }

    public function approve(int $id, int $adminId, array $input): array
    {
        $errors = [];
        $expiresAt = $this->cleanExpiry($input['expires_at'] ?? null, $errors);
        if ($errors) {
            throw new ValidationException($errors);
        }

        $q = $this->inTransaction($id, function (array $locked) use ($adminId, $expiresAt) {
            $this->assertStatus($locked, self::APPROVABLE, 'approve it');
            $qid = (int)$locked['id'];
            if (!$this->repo->items($qid)) {
                throw new DomainException('A quotation with no items can\'t be approved', 422);
            }
            $profile = $this->profiles->find((int)$locked['dealer_profile_id']);
            if (!DealerContext::isActiveDealer($profile)) {
                throw new DomainException('This dealer is not active (suspended, expired or not yet active), so the quotation can\'t be approved.', 409);
            }

            $expiry = $expiresAt;
            if ($expiry === null) {
                $current = $locked['expires_at'] ? strtotime((string)$locked['expires_at']) : null;
                $expiry = $current !== null && $current > time()
                    ? (string)$locked['expires_at']
                    : date('Y-m-d H:i:s', strtotime('+' . $this->expiryDays() . ' days'));
            }
            $this->repo->update($qid, [
                'status' => 'approved',
                'approved_by' => $adminId,
                'approved_at' => date('Y-m-d H:i:s'),
                'expires_at' => $expiry,
                'expiry_reminder_sent_at' => null,
            ]);
            $this->repo->addMessage($qid, $adminId, 'system', 'dealer', 'Approved. Valid until ' . date('j M Y H:i', strtotime($expiry)) . '.');
            AdminActivityLogger::log($adminId, 'quotation.approved', 'quotation', $qid, [
                'version' => (int)$locked['current_version'],
                'total' => $locked['total'],
                'expires_at' => $expiry,
            ]);
        });

        $this->mailer->approvedQuote($q, $this->userOf((int)$q['user_id']));
        return $this->adminShape($q);
    }

    public function adminReject(int $id, int $adminId, string $reason): array
    {
        $reason = trim($reason);
        if (mb_strlen($reason) < 5 || mb_strlen($reason) > self::MESSAGE_MAX) {
            throw new ValidationException(['reason' => ['Give the dealer a reason (5 to ' . self::MESSAGE_MAX . ' characters).']]);
        }
        $q = $this->inTransaction($id, function (array $locked) use ($adminId, $reason) {
            $this->assertStatus($locked, QuotationRepository::OPEN_STATUSES, 'reject it');
            $qid = (int)$locked['id'];
            $this->repo->update($qid, [
                'status' => 'rejected',
                'rejection_reason' => $reason,
                'rejected_by_role' => 'admin',
            ]);
            $this->repo->addMessage($qid, $adminId, 'system', 'dealer', "Rejected: {$reason}");
            AdminActivityLogger::log($adminId, 'quotation.rejected', 'quotation', $qid, ['reason' => $reason, 'from' => $locked['status']]);
        });

        $this->mailer->rejectedByAdmin($q, $this->profileOf($q), $this->userOf((int)$q['user_id']), $reason);
        return $this->adminShape($q);
    }

    // ------------------------------------------------------------------ cron

    /** Marks approved quotations past expires_at as expired. Returns how many changed. */
    public function expireDue(): int
    {
        $count = 0;
        foreach ($this->repo->expiredIds(500) as $id) {
            DatabaseManager::beginTransaction();
            try {
                $q = $this->repo->lock($id);
                if ($q && $q['status'] === 'approved' && $this->isPastExpiry($q)) {
                    $this->repo->update($id, ['status' => 'expired']);
                    $this->repo->addMessage($id, null, 'system', 'dealer', 'The offer expired before it was accepted.');
                    $count++;
                }
                DatabaseManager::commit();
            } catch (\Throwable $e) {
                DatabaseManager::rollBack();
                error_log("b2b:expire-quotations: quotation {$id}: " . $e->getMessage());
            }
        }
        return $count;
    }

    /** One reminder per approval, 48 hours before the offer expires. */
    public function sendExpiryReminders(): int
    {
        $count = 0;
        foreach ($this->repo->expiringSoon(48, 200) as $q) {
            $claimed = DatabaseManager::query(
                "UPDATE dealer_quotations SET expiry_reminder_sent_at = NOW()
                 WHERE id = :id AND status = 'approved' AND expiry_reminder_sent_at IS NULL",
                ['id' => (int)$q['id']]
            )->rowCount();
            if ($claimed === 1) {
                $this->mailer->expiring($q, $this->userOf((int)$q['user_id']));
                $count++;
            }
        }
        return $count;
    }

    // ------------------------------------------------------------------ helpers

    /** @return array{0: array, 1: array} the quotation (expiry applied) and the caller's profile */
    private function ownQuotation(int $userId, int $id): array
    {
        $profile = DealerContext::profileFor($userId);
        $q = $profile ? $this->repo->findForDealer($id, (int)$profile['id']) : null;
        if (!$q) {
            throw new DomainException('Quotation not found', 404);
        }
        return [$this->expireIfDue($q), $profile];
    }

    /**
     * Locks the row, runs $change, commits, and returns the fresh row.
     *
     * @param callable(array $locked): void $change
     */
    private function inTransaction(int $id, callable $change): array
    {
        DatabaseManager::beginTransaction();
        $expiredNow = false;
        try {
            $locked = $this->repo->lock($id);
            if (!$locked) {
                throw new DomainException('Quotation not found', 404);
            }
            if ($locked['status'] === 'approved' && $this->isPastExpiry($locked)) {
                $this->repo->update($id, ['status' => 'expired']);
                $this->repo->addMessage($id, null, 'system', 'dealer', 'The offer expired before it was accepted.');
                $locked['status'] = 'expired';
                $expiredNow = true;
            }
            $change($locked);
            DatabaseManager::commit();
        } catch (DomainException $e) {
            // The action isn't allowed, but an expiry found on the way is still true: keep it.
            $expiredNow ? DatabaseManager::commit() : DatabaseManager::rollBack();
            throw $e;
        } catch (\Throwable $e) {
            DatabaseManager::rollBack();
            throw $e;
        }
        return $this->repo->find($id);
    }

    private function assertStatus(array $q, array $allowed, string $action): void
    {
        if (!in_array($q['status'], $allowed, true)) {
            throw new DomainException(
                "This quotation is now '" . str_replace('_', ' ', (string)$q['status']) . "', so you can't {$action}. Reload the page.",
                409
            );
        }
    }

    private function isPastExpiry(array $q): bool
    {
        return !empty($q['expires_at']) && strtotime((string)$q['expires_at']) <= time();
    }

    /** Lazy expiry (Risk R10): the cron may not have run yet. */
    private function expireIfDue(array $q): array
    {
        if ($q['status'] !== 'approved' || !$this->isPastExpiry($q)) {
            return $q;
        }
        $this->inTransaction((int)$q['id'], fn () => null);
        return $this->repo->find((int)$q['id']) ?? $q;
    }

    private function expireOverdue(?int $profileId): void
    {
        $ids = DatabaseManager::query(
            "SELECT id FROM dealer_quotations
             WHERE status = 'approved' AND expires_at IS NOT NULL AND expires_at <= NOW()"
            . ($profileId !== null ? ' AND dealer_profile_id = :p' : '') . ' LIMIT 100',
            $profileId !== null ? ['p' => $profileId] : []
        )->fetchAll(\PDO::FETCH_COLUMN);
        foreach ($ids as $id) {
            $this->inTransaction((int)$id, fn () => null);
        }
    }

    /**
     * Quotation lines as order lines at the quoted price, after checking each product
     * can still be sold. Stock is taken by OrderPlacementService's guarded decrement.
     *
     * @return array{0: array, 1: array}
     */
    private function orderLines(array $items): array
    {
        $lineItems = [];
        $stockUpdates = [];
        foreach ($items as $item) {
            $product = $this->products->find((int)$item['product_id']);
            if (!$product || $product['status'] !== 'active') {
                throw new DomainException("{$item['name_en']} is no longer available. Ask us to update the quotation.", 409);
            }
            $qty = (int)$item['quantity'];
            if ($product['stock_status'] === 'out_of_stock'
                || (!empty($product['track_inventory']) && (int)$product['stock_quantity'] < $qty)) {
                throw new DomainException("There isn't enough stock of {$item['name_en']} right now. Ask us to update the quotation.", 409);
            }
            $lineItems[] = [
                'product_id' => (int)$item['product_id'],
                'sku' => $item['sku'],
                'name_en' => $item['name_en'],
                'name_ar' => $item['name_ar'] ?? $product['name_ar'],
                'unit_price' => (float)$item['unit_price'],
                'retail_unit_price' => (float)$item['retail_unit_price'],
                'pricing_type' => 'quoted',
                'quantity' => $qty,
                'line_total' => (float)$item['line_total'],
            ];
            if (!empty($product['track_inventory'])) {
                $stockUpdates[(int)$item['product_id']] = [
                    'quantity' => ($stockUpdates[(int)$item['product_id']]['quantity'] ?? 0) + $qty,
                    'name_en' => $item['name_en'],
                ];
            }
        }
        if (!$lineItems) {
            throw new DomainException('This quotation has no items', 422);
        }
        return [$lineItems, $stockUpdates];
    }

    /** @return array{subtotal:float, vat:float, total:float} */
    private function totals(array $lines, float $shipping, float $discount): array
    {
        $lineTotals = OrderTotals::lines($lines);
        $finished = OrderTotals::finish($lineTotals['subtotal'], $lineTotals['vat'], $shipping, $discount);
        return ['subtotal' => $lineTotals['subtotal'], 'vat' => $finished['vat'], 'total' => $finished['total']];
    }

    /**
     * Admin-edited lines: product id, quantity and unit price. Names, SKU, VAT and
     * shipping flags come from the product row; the retail price is kept for comparison.
     */
    private function cleanLines(mixed $raw, array &$errors): array
    {
        if (!is_array($raw) || !$raw) {
            $errors['items'] = ['Keep at least one line.'];
            return [];
        }
        if (count($raw) > self::MAX_LINES) {
            $errors['items'] = ['A quotation can have at most ' . self::MAX_LINES . ' lines.'];
            return [];
        }
        $lines = [];
        $seen = [];
        foreach (array_values($raw) as $i => $row) {
            $productId = (int)($row['product_id'] ?? 0);
            $qty = $row['quantity'] ?? null;
            $price = (string)($row['unit_price'] ?? '');
            if (isset($seen[$productId])) {
                $errors["items.{$i}.product_id"] = ['This product is already on the quotation. Change the quantity on that line instead.'];
                continue;
            }
            $seen[$productId] = true;
            $product = $productId > 0 ? $this->products->find($productId) : null;
            if (!$product || $product['status'] !== 'active') {
                $errors["items.{$i}.product_id"] = ['This product doesn\'t exist or isn\'t on sale.'];
                continue;
            }
            if (!is_numeric($qty) || (int)$qty != $qty || (int)$qty < 1 || (int)$qty > 100000) {
                $errors["items.{$i}.quantity"] = ['Enter a whole quantity from 1 to 100000.'];
                continue;
            }
            if (!preg_match('/^\d{1,8}(\.\d{1,2})?$/', $price) || (float)$price <= 0) {
                $errors["items.{$i}.unit_price"] = ['Enter a unit price in AED greater than 0 (up to 2 decimals).'];
                continue;
            }
            $unit = round((float)$price, 2);
            $lines[] = [
                'product_id' => $productId,
                'sku' => $product['sku'],
                'name_en' => $product['name_en'],
                'name_ar' => $product['name_ar'],
                'quantity' => (int)$qty,
                'unit_price' => $unit,
                'retail_unit_price' => (float)$product['price'],
                'line_total' => round($unit * (int)$qty, 2),
                'vat_inclusive' => (bool)$product['vat_inclusive'],
                'free_shipping' => (bool)$product['free_shipping'],
            ];
        }
        return $lines;
    }

    private function money(mixed $raw, string $field, string $label, array &$errors, float $min, float $max): float
    {
        $value = trim((string)($raw ?? '0'));
        if ($value === '') {
            return 0.0;
        }
        if (!preg_match('/^\d{1,9}(\.\d{1,2})?$/', $value) || (float)$value < $min || (float)$value > $max) {
            $errors[$field] = ["Enter the {$label} in AED (0 or more, up to 2 decimals)."];
            return 0.0;
        }
        return round((float)$value, 2);
    }

    private function cleanExpiry(mixed $raw, array &$errors): ?string
    {
        $value = trim((string)($raw ?? ''));
        if ($value === '') {
            return null;
        }
        $ts = strtotime($value);
        if ($ts === false) {
            $errors['expires_at'] = ['Enter a valid date.'];
            return null;
        }
        // A bare date means "valid through that day".
        if (preg_match('/^\d{4}-\d{2}-\d{2}$/', $value)) {
            $ts = strtotime($value . ' 23:59:59');
        }
        if ($ts <= time()) {
            $errors['expires_at'] = ['The expiry must be in the future.'];
            return null;
        }
        if ($ts > strtotime('+1 year')) {
            $errors['expires_at'] = ['Keep the expiry within a year.'];
            return null;
        }
        return date('Y-m-d H:i:s', $ts);
    }

    private function cleanMessage(string $body): string
    {
        $body = trim($body);
        if ($body === '' || mb_strlen($body) > self::MESSAGE_MAX) {
            throw new ValidationException(['body' => ['Write a message (up to ' . self::MESSAGE_MAX . ' characters).']]);
        }
        return $body;
    }

    private function snapshot(array $q, array $items): array
    {
        return [
            'items' => array_map(fn (array $i) => [
                'product_id' => (int)$i['product_id'],
                'sku' => $i['sku'],
                'name_en' => $i['name_en'],
                'name_ar' => $i['name_ar'],
                'quantity' => (int)$i['quantity'],
                'unit_price' => $i['unit_price'],
                'retail_unit_price' => $i['retail_unit_price'],
                'line_total' => $i['line_total'],
            ], $items),
            'subtotal' => $q['subtotal'],
            'discount_amount' => $q['discount_amount'],
            'shipping_amount' => $q['shipping_amount'],
            'vat_amount' => $q['vat_amount'],
            'total' => $q['total'],
            'expires_at' => $q['expires_at'],
        ];
    }

    private function generateNumber(): string
    {
        do {
            $number = 'QUO-' . date('ymd') . '-' . strtoupper(substr(bin2hex(random_bytes(4)), 0, 6));
        } while ($this->repo->numberTaken($number));
        return $number;
    }

    private function expiryDays(): int
    {
        return max(1, min(365, (int)$this->settings->get('b2b_quotation_expiry_days', 14)));
    }

    private function userOf(int $userId): array
    {
        return $this->users->find($userId) ?? ['name' => '', 'email' => ''];
    }

    private function profileOf(array $q): array
    {
        return $this->profiles->find((int)$q['dealer_profile_id']) ?? [];
    }

    private function meta(int $total, int $page, int $perPage): array
    {
        return [
            'total' => $total,
            'current_page' => $page,
            'per_page' => $perPage,
            'total_pages' => max(1, (int)ceil($total / max(1, $perPage))),
        ];
    }

    /** Fields both the dealer and admin views share. */
    private function baseShape(array $q, array $items): array
    {
        $order = null;
        if ($q['converted_order_id'] !== null) {
            $row = DatabaseManager::query(
                "SELECT id, order_number, status, payment_status FROM orders WHERE id = :id",
                ['id' => (int)$q['converted_order_id']]
            )->fetch();
            $order = $row ? [
                'id' => (int)$row['id'],
                'order_number' => $row['order_number'],
                'status' => $row['status'],
                'payment_status' => $row['payment_status'],
            ] : null;
        }

        return [
            'id' => (int)$q['id'],
            'quotation_number' => $q['quotation_number'],
            'status' => $q['status'],
            'current_version' => (int)$q['current_version'],
            'subtotal' => (float)$q['subtotal'],
            'discount_amount' => (float)$q['discount_amount'],
            'shipping_amount' => (float)$q['shipping_amount'],
            'vat_rate' => (float)$q['vat_rate'],
            'vat_amount' => (float)$q['vat_amount'],
            'total' => (float)$q['total'],
            'currency' => $q['currency'],
            'payment_method_pref' => $q['payment_method_pref'],
            'payment_method_label' => $q['payment_method_pref'] ? PaymentMethodPolicy::label((string)$q['payment_method_pref']) : null,
            'shipping_address' => $q['shipping_snapshot'] ? json_decode((string)$q['shipping_snapshot'], true) : null,
            'is_first_order' => (int)$q['is_first_order'] === 1,
            'expires_at' => $q['expires_at'],
            'submitted_at' => $q['submitted_at'],
            'approved_at' => $q['approved_at'],
            'rejection_reason' => $q['rejection_reason'],
            'rejected_by_role' => $q['rejected_by_role'],
            'dealer_accepted_at' => $q['dealer_accepted_at'],
            'converted_order' => $order,
            'created_at' => $q['created_at'],
            'updated_at' => $q['updated_at'],
            'items' => array_map(fn (array $i) => [
                'id' => (int)$i['id'],
                'product_id' => (int)$i['product_id'],
                'sku' => $i['sku'],
                'name_en' => $i['name_en'],
                'name_ar' => $i['name_ar'],
                'quantity' => (int)$i['quantity'],
                'unit_price' => (float)$i['unit_price'],
                'retail_unit_price' => (float)$i['retail_unit_price'],
                'line_total' => (float)$i['line_total'],
                'vat_inclusive' => (int)$i['vat_inclusive'] === 1,
            ], $items),
            'versions' => array_map(fn (array $v) => [
                'version_no' => (int)$v['version_no'],
                'snapshot' => $v['snapshot'],
                'reason' => $v['reason'],
                'created_at' => $v['created_at'],
                'created_by_name' => $v['created_by_name'],
            ], $this->repo->versions((int)$q['id'])),
        ];
    }

    private function dealerShape(array $q, array $profile): array
    {
        $open = in_array($q['status'], QuotationRepository::OPEN_STATUSES, true);
        $active = DealerContext::isActiveDealer($profile);
        $canAccept = $q['status'] === 'approved' && $active && !$this->isPastExpiry($q);

        return $this->baseShape($q, $this->repo->items((int)$q['id'])) + [
            // Staff-only notes are never sent to the dealer.
            'messages' => $this->repo->messages((int)$q['id'], false),
            'can_accept' => $canAccept,
            'can_decline' => $open,
            'can_message' => $open,
            'payment_methods' => $canAccept ? $this->paymentPolicy->methods(PaymentMethodPolicy::CHANNEL_B2B) : [],
            'bank_transfer' => $canAccept && $this->paymentPolicy->bankAccounts()
                ? ['accounts' => $this->paymentPolicy->bankAccounts(), 'instructions' => $this->paymentPolicy->bankTransferInstructions()]
                : null,
            'dealer' => [
                'business_name' => $profile['business_name'] ?? null,
                'dealer_code' => $profile['dealer_code'] ?? null,
                'trn' => $profile['trn'] ?? null,
                'address_line' => $profile['address_line'] ?? null,
                'city' => $profile['city'] ?? null,
                'emirate' => $profile['emirate'] ?? null,
            ],
            'company' => $this->company(),
        ];
    }

    private function adminShape(array $q): array
    {
        $items = $this->repo->items((int)$q['id']);
        $profile = $this->profileOf($q);
        $user = $this->userOf((int)$q['user_id']);
        $approver = $q['approved_by'] ? $this->users->find((int)$q['approved_by']) : null;

        // Current price and stock beside each line, so the team can see what they're quoting against.
        $live = $items ? $this->products->pricesForIds(array_map(fn ($i) => (int)$i['product_id'], $items)) : [];
        $stock = [];
        foreach ($items as $i) {
            $p = $this->products->find((int)$i['product_id']);
            $stock[(int)$i['product_id']] = $p ? [
                'status' => $p['status'],
                'stock_status' => $p['stock_status'],
                'track_inventory' => (int)$p['track_inventory'] === 1,
                'stock_quantity' => (int)$p['stock_quantity'],
            ] : null;
        }

        $shape = $this->baseShape($q, $items);
        foreach ($shape['items'] as &$line) {
            $row = $live[$line['product_id']] ?? null;
            $line['current_retail_price'] = $row ? (float)$row['price'] : null;
            $line['current_wholesale_price'] = $row && $row['wholesale_price'] !== null ? (float)$row['wholesale_price'] : null;
            $line['stock'] = $stock[$line['product_id']] ?? null;
        }
        unset($line);

        return $shape + [
            'messages' => $this->repo->messages((int)$q['id'], true),
            'approved_by_name' => $approver['name'] ?? null,
            'dealer' => [
                'id' => (int)($profile['id'] ?? 0),
                'business_name' => $profile['business_name'] ?? null,
                'dealer_code' => $profile['dealer_code'] ?? null,
                'status' => $profile['status'] ?? null,
                'is_active' => DealerContext::isActiveDealer($profile ?: null),
                'email' => $user['email'] ?? null,
                'contact_name' => $user['name'] ?? null,
                'phone' => $profile['business_phone'] ?? null,
            ],
            'allowed' => [
                'start_review' => $q['status'] === 'submitted',
                'revise' => in_array($q['status'], self::REVISABLE, true),
                'approve' => in_array($q['status'], self::APPROVABLE, true),
                'reject' => in_array($q['status'], QuotationRepository::OPEN_STATUSES, true),
                'message' => in_array($q['status'], QuotationRepository::OPEN_STATUSES, true),
            ],
            'default_expiry_days' => $this->expiryDays(),
        ];
    }

    /** Seller details for the printable quotation. */
    private function company(): array
    {
        return [
            'name' => (string)$this->settings->get('site_name', 'Auto Parts UAE'),
            'address' => (string)$this->settings->get('contact_address_en', ''),
            'phone' => (string)$this->settings->get('contact_phone', ''),
            'email' => (string)$this->settings->get('contact_email', ''),
            'trn' => (string)$this->settings->get('company_trn', ''),
        ];
    }
}
