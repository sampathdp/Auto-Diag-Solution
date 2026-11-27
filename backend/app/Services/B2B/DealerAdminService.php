<?php

declare(strict_types=1);

namespace App\Services\B2B;

use App\Core\Database\DatabaseManager;
use App\Core\Encryption;
use App\Core\PrivateStorage;
use App\Exceptions\DomainException;
use App\Exceptions\ValidationException;
use App\Repositories\AdminNoteRepository;
use App\Repositories\DealerProfileRepository;
use App\Repositories\UserRepository;
use App\Services\AdminActivityLogger;
use App\Services\PermissionService;
use App\Services\SettingService;
use App\Support\Permissions;

/**
 * Admin review of dealer applications and management of approved dealers.
 *
 * Every status change happens inside a transaction with the profile row locked
 * (SELECT ... FOR UPDATE), so two admins clicking at once can't both approve, or
 * approve and reject. Each change is written to dealer_status_history and
 * admin_activity_logs; emails are queued only after the commit.
 */
final class DealerAdminService
{
    private DealerProfileRepository $repo;
    private UserRepository $users;
    private PermissionService $permissions;
    private SettingService $settings;
    private DealerMailer $mailer;

    public function __construct()
    {
        $this->repo = new DealerProfileRepository();
        $this->users = new UserRepository();
        $this->permissions = new PermissionService();
        $this->settings = new SettingService();
        $this->mailer = new DealerMailer();
    }

    /**
     * @param string $view 'applications' (all submitted) | 'dealers' (approved + suspended) | a single status
     */
    public function list(string $view, string $search, int $page, int $perPage): array
    {
        $statuses = match ($view) {
            'dealers' => ['approved', 'suspended'],
            'open' => ['pending_review', 'under_review'],
            'draft', 'pending_review', 'under_review', 'approved', 'rejected', 'suspended' => [$view],
            default => [],
        };
        $result = $this->repo->adminPaginate($statuses, trim($search), max(1, $page), min(100, max(1, $perPage)));

        return [
            'items' => $result['items'],
            'meta' => [
                'total' => $result['total'],
                'current_page' => max(1, $page),
                'per_page' => $perPage,
                'total_pages' => max(1, (int)ceil($result['total'] / max(1, $perPage))),
            ],
            'counts' => $this->repo->statusCounts(),
        ];
    }

    public function detail(int $id, int $adminId): array
    {
        $p = $this->repo->find($id);
        if (!$p) {
            throw new DomainException('Dealer application not found', 404);
        }
        $user = $this->users->find((int)$p['user_id']);
        $reviewer = $p['reviewed_by'] ? $this->users->find((int)$p['reviewed_by']) : null;

        // The full ID number is as sensitive as the ID card image: same permission.
        $canSeeDocs = $this->permissions->userHas($adminId, Permissions::B2B_DOCUMENTS_VIEW);
        $ownerId = null;
        if ($canSeeDocs && !empty($p['owner_id_number_enc'])) {
            try {
                $ownerId = Encryption::decrypt((string)$p['owner_id_number_enc']);
            } catch (\Throwable) {
                $ownerId = null;
            }
        }

        $credit = $this->repo->creditAccount($id);
        unset($p['owner_id_number_enc']);

        return [
            'profile' => $p + [
                'owner_id_number' => $ownerId,
                'owner_id_number_masked' => $p['owner_id_last4'] ? '•••• ' . $p['owner_id_last4'] : null,
            ],
            'user' => $user ? [
                'id' => (int)$user['id'],
                'name' => $user['name'],
                'email' => $user['email'],
                'phone' => $user['phone'] ?? null,
                'created_at' => $user['created_at'],
            ] : null,
            'reviewer' => $reviewer ? ['id' => (int)$reviewer['id'], 'name' => $reviewer['name']] : null,
            'documents' => $this->repo->activeDocuments($id),
            'can_view_documents' => $canSeeDocs,
            'history' => $this->repo->history($id),
            'notes' => (new AdminNoteRepository())->forEntity('dealer', $id),
            'credit' => $credit,
            'needs_quotation' => DealerContext::needsQuotation($p),
            'quotation_counts' => (new \App\Repositories\QuotationRepository())->statusCounts($id),
            'suggested_dealer_code' => $p['dealer_code'] ?: $this->suggestDealerCode(),
            'defaults' => [
                'credit_enabled' => (bool)$this->settings->get('b2b_default_credit_enabled', false),
                'credit_period_days' => (int)$this->settings->get('b2b_default_credit_period_days', 30),
            ],
        ];
    }

    public function streamDocument(int $documentId, int $adminId): never
    {
        $this->permissions->authorize($adminId, Permissions::B2B_DOCUMENTS_VIEW);
        $doc = $this->repo->findDocument($documentId);
        if (!$doc) {
            throw new DomainException('Document not found', 404);
        }
        AdminActivityLogger::log($adminId, 'dealer.document_viewed', 'dealer', (int)$doc['dealer_profile_id'], [
            'document_id' => $documentId,
            'doc_type' => $doc['doc_type'],
        ]);
        PrivateStorage::stream((string)$doc['storage_key'], (string)$doc['original_name']);
    }

    public function startReview(int $id, int $adminId): array
    {
        $this->transition($id, $adminId, ['pending_review'], 'under_review', 'Review started', function () use ($adminId) {
            return ['reviewed_by' => $adminId];
        });
        return $this->detail($id, $adminId);
    }

    public function requestInfo(int $id, int $adminId, string $message): array
    {
        $message = trim($message);
        if (mb_strlen($message) < 5 || mb_strlen($message) > 2000) {
            throw new ValidationException(['message' => ['Tell the dealer what is missing (5 to 2000 characters).']]);
        }
        [$profile] = $this->transition($id, $adminId, ['pending_review', 'under_review'], 'draft', $message, function () use ($message, $adminId) {
            return ['info_request_message' => $message, 'reviewed_by' => $adminId, 'reviewed_at' => date('Y-m-d H:i:s')];
        });
        $this->mailer->infoRequested($profile, $this->userOf($profile), $message);
        return $this->detail($id, $adminId);
    }

    /**
     * @param array{dealer_code?:string, wholesale_enabled?:bool, credit_enabled?:bool, credit_limit?:mixed,
     *              credit_period_days?:mixed, payment_terms?:string, activated_at?:string, expires_at?:string} $input
     */
    public function approve(int $id, int $adminId, array $input): array
    {
        $code = strtoupper(trim((string)($input['dealer_code'] ?? '')));
        $errors = [];
        if (!preg_match('/^[A-Z0-9][A-Z0-9-]{2,29}$/', $code)) {
            $errors['dealer_code'] = ['Use 3 to 30 letters, numbers or dashes, e.g. DLR-00012.'];
        } elseif ($this->repo->dealerCodeTaken($code, $id)) {
            $errors['dealer_code'] = ['Another dealer already has this code.'];
        }

        $credit = $this->cleanCredit($input, $errors);
        if ($credit['enabled']) {
            $this->permissions->authorize($adminId, Permissions::B2B_CREDIT_MANAGE);
        }

        $activatedAt = $this->cleanDate($input['activated_at'] ?? null, 'activated_at', $errors) ?? date('Y-m-d H:i:s');
        $expiresAt = $this->cleanDate($input['expires_at'] ?? null, 'expires_at', $errors);
        if ($expiresAt !== null && strtotime($expiresAt) <= strtotime($activatedAt)) {
            $errors['expires_at'] = ['The expiry date must be after the activation date.'];
        }
        if ($errors) {
            throw new ValidationException($errors);
        }

        $wholesale = array_key_exists('wholesale_enabled', $input) ? (bool)$input['wholesale_enabled'] : true;
        $requiresQuotation = (bool)$this->settings->get('b2b_first_order_requires_quotation', true);

        [$profile] = $this->transition(
            $id,
            $adminId,
            ['pending_review', 'under_review'],
            'approved',
            "Approved as {$code}",
            function (array $locked) use ($code, $wholesale, $requiresQuotation, $activatedAt, $expiresAt, $adminId, $credit) {
                $this->repo->saveCreditTerms($locked['id'], $credit['enabled'], $credit['limit'], $credit['days'], $credit['terms'], $adminId);
                return [
                    'dealer_code' => $code,
                    'wholesale_enabled' => $wholesale ? 1 : 0,
                    'requires_quotation' => $requiresQuotation ? 1 : 0,
                    'activated_at' => $activatedAt,
                    'expires_at' => $expiresAt,
                    'reviewed_by' => $adminId,
                    'reviewed_at' => date('Y-m-d H:i:s'),
                    'rejection_reason' => null,
                    'info_request_message' => null,
                    'suspension_reason' => null,
                ];
            },
            [
                'dealer_code' => $code,
                'wholesale_enabled' => $wholesale,
                'credit_enabled' => $credit['enabled'],
                'credit_limit' => $credit['limit'],
                'credit_period_days' => $credit['days'],
                'activated_at' => $activatedAt,
                'expires_at' => $expiresAt,
            ]
        );

        $this->mailer->approved($profile, $this->userOf($profile), $this->repo->creditAccount($id));
        return $this->detail($id, $adminId);
    }

    public function reject(int $id, int $adminId, string $reason, bool $allowResubmission): array
    {
        $reason = trim($reason);
        if (mb_strlen($reason) < 5 || mb_strlen($reason) > 2000) {
            throw new ValidationException(['reason' => ['Give the dealer a reason (5 to 2000 characters).']]);
        }
        [$profile] = $this->transition($id, $adminId, ['pending_review', 'under_review'], 'rejected', $reason, function () use ($reason, $allowResubmission, $adminId) {
            return [
                'rejection_reason' => $reason,
                'allow_resubmission' => $allowResubmission ? 1 : 0,
                'reviewed_by' => $adminId,
                'reviewed_at' => date('Y-m-d H:i:s'),
            ];
        }, ['allow_resubmission' => $allowResubmission]);
        $this->mailer->rejected($profile, $this->userOf($profile), $reason, $allowResubmission);
        return $this->detail($id, $adminId);
    }

    public function suspend(int $id, int $adminId, string $reason): array
    {
        $reason = trim($reason);
        if (mb_strlen($reason) < 5 || mb_strlen($reason) > 2000) {
            throw new ValidationException(['reason' => ['Say why the dealer is suspended (5 to 2000 characters).']]);
        }
        [$profile] = $this->transition($id, $adminId, ['approved'], 'suspended', $reason, fn () => ['suspension_reason' => $reason]);
        $this->mailer->suspended($profile, $this->userOf($profile), $reason);
        return $this->detail($id, $adminId);
    }

    public function reactivate(int $id, int $adminId): array
    {
        [$profile] = $this->transition($id, $adminId, ['suspended'], 'approved', 'Reactivated', fn () => ['suspension_reason' => null]);
        $this->mailer->reactivated($profile, $this->userOf($profile));
        return $this->detail($id, $adminId);
    }

    /** Change credit terms of an approved or suspended dealer (needs b2b.credit.manage). */
    public function updateCredit(int $id, int $adminId, array $input): array
    {
        $this->permissions->authorize($adminId, Permissions::B2B_CREDIT_MANAGE);
        $errors = [];
        $credit = $this->cleanCredit($input, $errors);
        if ($errors) {
            throw new ValidationException($errors);
        }

        DatabaseManager::beginTransaction();
        try {
            $locked = $this->repo->lock($id);
            if (!$locked) {
                throw new DomainException('Dealer not found', 404);
            }
            if (!in_array($locked['status'], ['approved', 'suspended'], true)) {
                throw new DomainException('Credit terms can only be set for approved dealers', 409);
            }
            $before = $this->repo->creditAccount($id);
            $this->repo->saveCreditTerms($id, $credit['enabled'], $credit['limit'], $credit['days'], $credit['terms'], $adminId);
            AdminActivityLogger::log($adminId, 'dealer.credit_terms_changed', 'dealer', $id, [
                'from' => $before ? [
                    'credit_enabled' => (bool)$before['credit_enabled'],
                    'credit_limit' => $before['credit_limit'],
                    'credit_period_days' => (int)$before['credit_period_days'],
                    'payment_terms' => $before['payment_terms'],
                ] : null,
                'to' => [
                    'credit_enabled' => $credit['enabled'],
                    'credit_limit' => $credit['limit'],
                    'credit_period_days' => $credit['days'],
                    'payment_terms' => $credit['terms'],
                ],
            ]);
            DatabaseManager::commit();
        } catch (\Throwable $e) {
            DatabaseManager::rollBack();
            throw $e;
        }
        return $this->detail($id, $adminId);
    }

    /**
     * Quotation rule for one dealer: force_quotation sends every order through a
     * quotation; requires_quotation is the first-order requirement (copied from the
     * setting at approval).
     */
    public function updateQuotationRule(int $id, int $adminId, array $input): array
    {
        DatabaseManager::beginTransaction();
        try {
            $locked = $this->repo->lock($id);
            if (!$locked) {
                throw new DomainException('Dealer not found', 404);
            }
            if (!in_array($locked['status'], ['approved', 'suspended'], true)) {
                throw new DomainException('The quotation rule can only be set for approved dealers', 409);
            }
            $changes = [];
            foreach (['force_quotation', 'requires_quotation'] as $field) {
                if (array_key_exists($field, $input)) {
                    $changes[$field] = filter_var($input[$field], FILTER_VALIDATE_BOOLEAN) ? 1 : 0;
                }
            }
            if (!$changes) {
                throw new ValidationException(['force_quotation' => ['Nothing to change.']]);
            }
            $this->repo->update($id, $changes);
            AdminActivityLogger::log($adminId, 'dealer.quotation_rule_changed', 'dealer', $id, [
                'from' => [
                    'force_quotation' => (int)$locked['force_quotation'] === 1,
                    'requires_quotation' => (int)$locked['requires_quotation'] === 1,
                ],
                'to' => array_map(fn ($v) => $v === 1, $changes),
            ]);
            DatabaseManager::commit();
        } catch (\Throwable $e) {
            DatabaseManager::rollBack();
            throw $e;
        }
        DealerContext::forget((int)$locked['user_id']);
        return $this->detail($id, $adminId);
    }

    public function addNote(int $id, int $adminId, string $note): array
    {
        $note = trim($note);
        if ($note === '' || mb_strlen($note) > 5000) {
            throw new ValidationException(['note' => ['Write a note (up to 5000 characters).']]);
        }
        if (!$this->repo->find($id)) {
            throw new DomainException('Dealer application not found', 404);
        }
        $notes = new AdminNoteRepository();
        $notes->create('dealer', $id, $adminId, $note);
        return $notes->forEntity('dealer', $id);
    }

    public function suggestDealerCode(): string
    {
        $n = $this->repo->maxId();
        do {
            $n++;
            $code = 'DLR-' . str_pad((string)$n, 5, '0', STR_PAD_LEFT);
        } while ($this->repo->dealerCodeTaken($code));
        return $code;
    }

    /**
     * Locks the row, checks the current status, applies the change and records it.
     *
     * @param string[] $from allowed current statuses
     * @param callable(array $locked): array $changes extra column updates
     * @return array{0: array} the updated profile
     */
    private function transition(int $id, int $adminId, array $from, string $to, ?string $reason, callable $changes, array $logExtra = []): array
    {
        DatabaseManager::beginTransaction();
        try {
            $locked = $this->repo->lock($id);
            if (!$locked) {
                throw new DomainException('Dealer application not found', 404);
            }
            if (!in_array($locked['status'], $from, true)) {
                throw new DomainException(
                    "This application is now '" . str_replace('_', ' ', $locked['status']) . "', so that action isn't available. Reload the page.",
                    409
                );
            }

            $locked['id'] = (int)$locked['id'];
            $update = array_merge(['status' => $to], $changes($locked));
            $this->repo->update($id, $update);
            $this->repo->addHistory($id, $locked['status'], $to, $reason, $adminId);
            AdminActivityLogger::log($adminId, "dealer.{$to}", 'dealer', $id, array_merge(
                ['from' => $locked['status'], 'to' => $to],
                $logExtra
            ));
            DatabaseManager::commit();
        } catch (\Throwable $e) {
            DatabaseManager::rollBack();
            throw $e;
        }

        DealerContext::forget((int)$locked['user_id']);
        return [$this->repo->find($id)];
    }

    private function userOf(array $profile): array
    {
        return $this->users->find((int)$profile['user_id']) ?? ['name' => '', 'email' => ''];
    }

    /** @return array{enabled:bool, limit:string, days:int, terms:?string} */
    private function cleanCredit(array $input, array &$errors): array
    {
        $enabled = (bool)($input['credit_enabled'] ?? false);
        $terms = trim((string)($input['payment_terms'] ?? ''));
        if (mb_strlen($terms) > 255) {
            $errors['payment_terms'] = ['Keep payment terms under 255 characters.'];
        }

        if (!$enabled) {
            return ['enabled' => false, 'limit' => '0.00', 'days' => 0, 'terms' => $terms !== '' ? $terms : null];
        }

        $limitRaw = (string)($input['credit_limit'] ?? '');
        if (!preg_match('/^\d{1,12}(\.\d{1,2})?$/', $limitRaw) || (float)$limitRaw <= 0) {
            $errors['credit_limit'] = ['Enter a credit limit in AED greater than 0 (up to 2 decimals).'];
        }
        $daysRaw = $input['credit_period_days'] ?? '';
        if (!is_numeric($daysRaw) || (int)$daysRaw != $daysRaw || (int)$daysRaw < 1 || (int)$daysRaw > 365) {
            $errors['credit_period_days'] = ['Enter a credit period between 1 and 365 days.'];
        }

        return [
            'enabled' => true,
            'limit' => number_format((float)$limitRaw, 2, '.', ''),
            'days' => (int)$daysRaw,
            'terms' => $terms !== '' ? $terms : null,
        ];
    }

    private function cleanDate(mixed $value, string $field, array &$errors): ?string
    {
        $value = trim((string)($value ?? ''));
        if ($value === '') {
            return null;
        }
        $ts = strtotime($value);
        if ($ts === false) {
            $errors[$field] = ['Enter a valid date.'];
            return null;
        }
        return date('Y-m-d H:i:s', $ts);
    }
}
