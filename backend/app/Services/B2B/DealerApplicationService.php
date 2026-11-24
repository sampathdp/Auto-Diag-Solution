<?php

declare(strict_types=1);

namespace App\Services\B2B;

use App\Core\Database\DatabaseManager;
use App\Core\Encryption;
use App\Core\PrivateStorage;
use App\Exceptions\DomainException;
use App\Repositories\DealerProfileRepository;
use App\Repositories\UserRepository;
use App\Services\RateLimiter;
use App\Services\SettingService;

/**
 * The dealer's side of the application: save a draft, upload documents, submit,
 * resubmit after a rejection or an information request. Every method works on the
 * caller's own profile only (looked up by user id), so there is no way to address
 * someone else's application.
 */
final class DealerApplicationService
{
    /** States in which the dealer may still change the application. */
    private const EDITABLE = ['draft', 'rejected'];

    private DealerProfileRepository $repo;
    private UserRepository $users;
    private SettingService $settings;

    public function __construct()
    {
        $this->repo = new DealerProfileRepository();
        $this->users = new UserRepository();
        $this->settings = new SettingService();
    }

    /** GET /partner/info: public, no personal data. */
    public function publicInfo(): array
    {
        return [
            'registration_enabled' => (bool)$this->settings->get('b2b_registration_enabled', true),
            'terms_html' => (string)$this->settings->get('b2b_terms_html', ''),
            'max_document_mb' => (int)$this->settings->get('b2b_max_document_mb', 5),
            'business_types' => DealerApplicationRules::BUSINESS_TYPES,
            'emirates' => DealerApplicationRules::EMIRATES,
        ];
    }

    /** GET /account/dealer: the caller's application (or null), shaped for the form. */
    public function mine(int $userId): ?array
    {
        $profile = $this->repo->findByUser($userId);
        return $profile ? $this->shapeForOwner($profile) : null;
    }

    /** PUT /account/dealer/application: create or update the draft. */
    public function saveDraft(int $userId, array $input): array
    {
        $user = $this->assertEligibleUser($userId);
        $fields = DealerApplicationRules::clean($input);

        DatabaseManager::beginTransaction();
        try {
            $profile = $this->repo->findByUser($userId);
            if ($profile) {
                $profile = $this->repo->lock((int)$profile['id']);
            }

            if (!$profile) {
                $this->assertRegistrationOpen();
                $id = $this->repo->create(['user_id' => $userId, 'status' => 'draft']);
                $this->repo->addHistory($id, null, 'draft', 'Application started', $userId);
                $profile = $this->repo->find($id);
            }

            $this->assertEditable($profile);
            $update = $this->toColumns($fields, $profile);

            // Editing a rejected application reopens it as a draft (resubmission).
            if ($profile['status'] === 'rejected') {
                $update['status'] = 'draft';
                $this->repo->addHistory((int)$profile['id'], 'rejected', 'draft', 'Dealer reopened the application', $userId);
            }

            if ($update) {
                $this->repo->update((int)$profile['id'], $update);
            }
            DatabaseManager::commit();
        } catch (\Throwable $e) {
            DatabaseManager::rollBack();
            throw $e;
        }

        DealerContext::forget($userId);
        return $this->mine((int)$user['id']);
    }

    /** POST /account/dealer/documents (multipart: doc_type, file). */
    public function uploadDocument(int $userId, string $docType, ?array $file): array
    {
        $this->assertEligibleUser($userId);
        if (!in_array($docType, DealerApplicationRules::APPLICATION_DOC_TYPES, true)) {
            throw new DomainException('Unknown document type', 422);
        }
        if (!$file) {
            throw new DomainException('Choose a file to upload', 422);
        }

        if (!RateLimiter::allow('dealer_doc_upload', (string)$userId, 40, 3600)) {
            throw new DomainException('Too many uploads. Please wait a while and try again.', 429);
        }

        $profile = $this->repo->findByUser($userId);
        if (!$profile) {
            // Uploading first is fine: start an empty draft.
            $this->saveDraft($userId, []);
            $profile = $this->repo->findByUser($userId);
        }
        $this->assertEditable($profile);

        $maxBytes = max(1, (int)$this->settings->get('b2b_max_document_mb', 5)) * 1024 * 1024;
        try {
            $stored = PrivateStorage::store($file, 'dealer-docs/' . (int)$profile['id'], $maxBytes);
        } catch (DomainException $e) {
            throw $e;
        } catch (\Exception $e) {
            throw new DomainException($e->getMessage(), 422);
        }
        if ($stored === null) {
            throw new DomainException('Choose a file to upload', 422);
        }

        DatabaseManager::beginTransaction();
        try {
            $locked = $this->repo->lock((int)$profile['id']);
            $this->assertEditable($locked);
            $this->repo->replaceDocument((int)$profile['id'], $docType, $stored, $userId);
            DatabaseManager::commit();
        } catch (\Throwable $e) {
            DatabaseManager::rollBack();
            PrivateStorage::delete($stored['key']);
            throw $e;
        }

        return $this->mine($userId);
    }

    /** GET /account/dealer/documents/{id}: the owner's own file only. */
    public function streamOwnDocument(int $userId, int $documentId): never
    {
        $profile = $this->repo->findByUser($userId);
        $doc = $this->repo->findDocument($documentId);
        // Same 404 whether the document doesn't exist or belongs to someone else.
        if (!$profile || !$doc || (int)$doc['dealer_profile_id'] !== (int)$profile['id']) {
            throw new DomainException('Document not found', 404);
        }
        PrivateStorage::stream((string)$doc['storage_key'], (string)$doc['original_name']);
    }

    /** POST /account/dealer/submit */
    public function submit(int $userId): array
    {
        $user = $this->assertEligibleUser($userId);
        if (!RateLimiter::allow('dealer_submit', (string)$userId, 10, 3600)) {
            throw new DomainException('Too many attempts. Please wait a while and try again.', 429);
        }

        DatabaseManager::beginTransaction();
        try {
            $profile = $this->repo->findByUser($userId);
            $profile = $profile ? $this->repo->lock((int)$profile['id']) : null;
            if (!$profile) {
                throw new DomainException('Fill in the application before submitting it', 422);
            }
            if ($profile['status'] !== 'draft') {
                throw new DomainException('This application has already been submitted', 409);
            }
            $this->assertRegistrationOpen();

            $docTypes = array_column($this->repo->activeDocuments((int)$profile['id']), 'doc_type');
            DealerApplicationRules::assertComplete($profile, $docTypes);

            $this->repo->update((int)$profile['id'], [
                'status' => 'pending_review',
                'submitted_at' => date('Y-m-d H:i:s'),
                'info_request_message' => null,
            ]);
            $this->repo->addHistory((int)$profile['id'], 'draft', 'pending_review', 'Submitted by dealer', $userId);
            DatabaseManager::commit();
        } catch (\Throwable $e) {
            DatabaseManager::rollBack();
            throw $e;
        }

        DealerContext::forget($userId);
        (new DealerMailer())->applicationReceived($this->repo->find((int)$profile['id']), $user);
        return $this->mine($userId);
    }

    /** Only real (non-guest) customer accounts can apply; admins can't. */
    private function assertEligibleUser(int $userId): array
    {
        $user = $this->users->find($userId);
        if (!$user || (int)($user['is_active'] ?? 1) !== 1) {
            throw new DomainException('Account not found', 404);
        }
        if ($user['role'] !== 'customer' || (int)($user['is_guest'] ?? 0) === 1) {
            throw new DomainException('Only customer accounts can apply to become a dealer. Create an account first.', 403);
        }
        return $user;
    }

    private function assertRegistrationOpen(): void
    {
        if (!(bool)$this->settings->get('b2b_registration_enabled', true)) {
            throw new DomainException('Dealer registration is closed at the moment', 403);
        }
    }

    private function assertEditable(?array $profile): void
    {
        if (!$profile) {
            throw new DomainException('Application not found', 404);
        }
        if (!in_array($profile['status'], self::EDITABLE, true)) {
            throw new DomainException('This application can no longer be changed', 409);
        }
        if ($profile['status'] === 'rejected' && (int)$profile['allow_resubmission'] !== 1) {
            throw new DomainException('This application was closed and cannot be resubmitted', 409);
        }
    }

    /** Maps cleaned fields to columns, encrypting the owner's ID number. */
    private function toColumns(array $fields, array $profile): array
    {
        $out = $fields;
        if (array_key_exists('owner_id_number', $fields)) {
            unset($out['owner_id_number']);
            $num = $fields['owner_id_number'];
            $out['owner_id_number_enc'] = $num === null ? null : Encryption::encrypt((string)$num);
            $out['owner_id_last4'] = $num === null ? null : substr(preg_replace('/\D/', '', (string)$num) ?: (string)$num, -4);
        }
        // Changing the ID type invalidates an ID number typed for the other type.
        if (array_key_exists('owner_id_type', $fields) && !array_key_exists('owner_id_number', $fields)
            && $fields['owner_id_type'] !== ($profile['owner_id_type'] ?? null)) {
            $out['owner_id_number_enc'] = null;
            $out['owner_id_last4'] = null;
        }
        return $out;
    }

    private function shapeForOwner(array $p): array
    {
        $ownerId = null;
        if (!empty($p['owner_id_number_enc'])) {
            try {
                $ownerId = Encryption::decrypt((string)$p['owner_id_number_enc']);
            } catch (\Throwable) {
                $ownerId = null;
            }
        }

        $credit = in_array($p['status'], ['approved', 'suspended'], true) ? $this->repo->creditAccount((int)$p['id']) : null;

        return [
            'id' => (int)$p['id'],
            'status' => $p['status'],
            'dealer' => DealerContext::summary($p),
            'editable' => in_array($p['status'], self::EDITABLE, true)
                && !($p['status'] === 'rejected' && (int)$p['allow_resubmission'] !== 1),
            'allow_resubmission' => (int)$p['allow_resubmission'] === 1,
            'rejection_reason' => $p['status'] === 'rejected' ? $p['rejection_reason'] : null,
            'info_request_message' => $p['status'] === 'draft' ? $p['info_request_message'] : null,
            'suspension_reason' => $p['status'] === 'suspended' ? $p['suspension_reason'] : null,
            'submitted_at' => $p['submitted_at'],
            'application' => [
                'business_name' => $p['business_name'],
                'business_type' => $p['business_type'],
                'trade_licence_number' => $p['trade_licence_number'],
                'trade_licence_expiry' => $p['trade_licence_expiry'],
                'trn' => $p['trn'],
                'business_email' => $p['business_email'],
                'business_phone' => $p['business_phone'],
                'whatsapp_number' => $p['whatsapp_number'],
                'owner_name' => $p['owner_name'],
                'owner_id_type' => $p['owner_id_type'],
                'owner_id_number' => $ownerId,
                'address_line' => $p['address_line'],
                'emirate' => $p['emirate'],
                'city' => $p['city'],
                'area' => $p['area'],
                'po_box' => $p['po_box'],
                'map_url' => $p['map_url'],
                'latitude' => $p['latitude'],
                'longitude' => $p['longitude'],
                'notes' => $p['notes'],
            ],
            'documents' => array_map(fn ($d) => [
                'id' => (int)$d['id'],
                'doc_type' => $d['doc_type'],
                'original_name' => $d['original_name'],
                'mime_type' => $d['mime_type'],
                'size_bytes' => (int)$d['size_bytes'],
                'uploaded_at' => $d['created_at'],
            ], $this->repo->activeDocuments((int)$p['id'])),
            'credit' => $credit ? [
                'credit_enabled' => (int)$credit['credit_enabled'] === 1,
                'credit_limit' => $credit['credit_limit'],
                'credit_period_days' => (int)$credit['credit_period_days'],
                'payment_terms' => $credit['payment_terms'],
            ] : null,
        ];
    }
}
