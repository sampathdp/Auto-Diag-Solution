<?php

declare(strict_types=1);

namespace App\Controllers\B2B;

use App\Controllers\BaseController;
use App\Core\Request;
use App\Services\B2B\QuotationService;

/** Admin: dealer quotations. Permissions are set per route. */
class QuotationAdminController extends BaseController
{
    private QuotationService $service;

    public function __construct()
    {
        $this->service = new QuotationService();
    }

    public function index(Request $request): void
    {
        $dealer = $request->input('dealer_id');
        $this->success($this->service->adminList(
            (string)$request->input('status', 'open'),
            (string)$request->input('search', ''),
            $dealer !== null && $dealer !== '' ? (int)$dealer : null,
            (int)($request->input('page') ?? 1),
            (int)($request->input('per_page') ?? 20)
        ));
    }

    public function show(Request $request): void
    {
        $this->success($this->service->adminShow($this->id($request)));
    }

    public function startReview(Request $request): void
    {
        $this->success($this->service->startReview($this->id($request), $this->admin($request)), 'Review started');
    }

    public function revise(Request $request): void
    {
        $this->success($this->service->revise($this->id($request), $this->admin($request), $request->all()), 'New version saved and sent to the dealer');
    }

    public function message(Request $request): void
    {
        $this->success($this->service->adminMessage($this->id($request), $this->admin($request), $request->all()), 'Message added');
    }

    public function approve(Request $request): void
    {
        $this->success($this->service->approve($this->id($request), $this->admin($request), $request->all()), 'Quotation approved. The dealer has been emailed.');
    }

    public function reject(Request $request): void
    {
        $this->success(
            $this->service->adminReject($this->id($request), $this->admin($request), (string)$request->input('reason', '')),
            'Quotation rejected. The dealer has been emailed.'
        );
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
