<?php

declare(strict_types=1);

namespace App\Controllers\B2B;

use App\Controllers\BaseController;
use App\Core\Request;
use App\Services\B2B\DealerApplicationService;

/**
 * The signed-in customer's own dealer application. Every action resolves the profile
 * from the authenticated user id; no endpoint accepts a profile id from the client.
 */
class DealerAccountController extends BaseController
{
    private DealerApplicationService $service;

    public function __construct()
    {
        $this->service = new DealerApplicationService();
    }

    /** GET /account/dealer */
    public function show(Request $request): void
    {
        $this->success($this->service->mine((int)$request->user->id));
    }

    /** PUT /account/dealer/application */
    public function saveDraft(Request $request): void
    {
        $this->success($this->service->saveDraft((int)$request->user->id, $request->all()), 'Application saved');
    }

    /** POST /account/dealer/documents  (multipart: doc_type, file) */
    public function uploadDocument(Request $request): void
    {
        $files = $request->getFiles();
        $this->success(
            $this->service->uploadDocument((int)$request->user->id, (string)$request->input('doc_type', ''), $files['file'] ?? null),
            'Document uploaded'
        );
    }

    /** GET /account/dealer/documents/{id} */
    public function document(Request $request): void
    {
        $this->service->streamOwnDocument((int)$request->user->id, (int)$request->getParam('id'));
    }

    /** POST /account/dealer/submit */
    public function submit(Request $request): void
    {
        $this->success($this->service->submit((int)$request->user->id), 'Application submitted');
    }
}
