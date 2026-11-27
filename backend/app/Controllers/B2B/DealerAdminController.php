<?php

declare(strict_types=1);

namespace App\Controllers\B2B;

use App\Controllers\BaseController;
use App\Core\Request;
use App\Services\B2B\DealerAdminService;

/** Admin: dealer applications and approved dealers. Permissions are set per route. */
class DealerAdminController extends BaseController
{
    private DealerAdminService $service;

    public function __construct()
    {
        $this->service = new DealerAdminService();
    }

    public function index(Request $request): void
    {
        $this->success($this->service->list(
            (string)$request->input('view', 'applications'),
            (string)$request->input('search', ''),
            (int)($request->input('page') ?? 1),
            (int)($request->input('per_page') ?? 20)
        ));
    }

    public function show(Request $request): void
    {
        $this->success($this->service->detail($this->id($request), $this->admin($request)));
    }

    public function document(Request $request): void
    {
        $this->service->streamDocument($this->id($request), $this->admin($request));
    }

    public function startReview(Request $request): void
    {
        $this->success($this->service->startReview($this->id($request), $this->admin($request)), 'Review started');
    }

    public function requestInfo(Request $request): void
    {
        $this->success(
            $this->service->requestInfo($this->id($request), $this->admin($request), (string)$request->input('message', '')),
            'The dealer has been asked for more information'
        );
    }

    public function approve(Request $request): void
    {
        $this->success($this->service->approve($this->id($request), $this->admin($request), $request->all()), 'Dealer approved');
    }

    public function reject(Request $request): void
    {
        $this->success(
            $this->service->reject(
                $this->id($request),
                $this->admin($request),
                (string)$request->input('reason', ''),
                filter_var($request->input('allow_resubmission', true), FILTER_VALIDATE_BOOLEAN)
            ),
            'Application rejected'
        );
    }

    public function suspend(Request $request): void
    {
        $this->success(
            $this->service->suspend($this->id($request), $this->admin($request), (string)$request->input('reason', '')),
            'Dealer suspended'
        );
    }

    public function reactivate(Request $request): void
    {
        $this->success($this->service->reactivate($this->id($request), $this->admin($request)), 'Dealer reactivated');
    }

    public function updateCredit(Request $request): void
    {
        $this->success($this->service->updateCredit($this->id($request), $this->admin($request), $request->all()), 'Credit terms saved');
    }

    public function updateQuotationRule(Request $request): void
    {
        $this->success($this->service->updateQuotationRule($this->id($request), $this->admin($request), $request->all()), 'Quotation rule saved');
    }

    public function addNote(Request $request): void
    {
        $this->success($this->service->addNote($this->id($request), $this->admin($request), (string)$request->input('note', '')), 'Note added');
    }

    private function id(Request $request): int
    {
        return (int)$request->getParam('id');
    }

    private function admin(Request $request): int
    {
        return (int)$request->user->id;
    }
}
