<?php

declare(strict_types=1);

namespace App\Controllers\B2B;

use App\Controllers\BaseController;
use App\Core\Request;
use App\Services\B2B\QuotationService;

/**
 * The signed-in dealer's own quotations. Every lookup is scoped to the caller's dealer
 * profile; another dealer's quotation id returns 404.
 */
class DealerQuotationController extends BaseController
{
    private QuotationService $service;

    public function __construct()
    {
        $this->service = new QuotationService();
    }

    /** GET /account/dealer/quotations */
    public function index(Request $request): void
    {
        $this->success($this->service->listForDealer(
            $this->user($request),
            (string)$request->input('status', 'all'),
            (int)($request->input('page') ?? 1),
            (int)($request->input('per_page') ?? 20)
        ));
    }

    /** GET /account/dealer/quotations/{id} */
    public function show(Request $request): void
    {
        $this->success($this->service->showForDealer($this->user($request), $this->id($request)));
    }

    /** POST /account/dealer/quotations/{id}/messages */
    public function message(Request $request): void
    {
        $this->success(
            $this->service->dealerMessage($this->user($request), $this->id($request), (string)$request->input('body', '')),
            'Message sent'
        );
    }

    /** POST /account/dealer/quotations/{id}/accept  {payment_method?} */
    public function accept(Request $request): void
    {
        $method = $request->input('payment_method');
        $result = $this->service->accept($this->user($request), $this->id($request), $method !== null ? (string)$method : null);
        $this->success($result, $result['already_converted'] ? 'This quotation was already accepted' : 'Quotation accepted. Your order is placed.', $result['already_converted'] ? 200 : 201);
    }

    /** POST /account/dealer/quotations/{id}/reject  {reason?} */
    public function reject(Request $request): void
    {
        $reason = $request->input('reason');
        $this->success(
            $this->service->dealerReject($this->user($request), $this->id($request), $reason !== null ? (string)$reason : null),
            'Quotation declined'
        );
    }

    private function id(Request $request): int
    {
        return (int)$request->getParam('id');
    }

    private function user(Request $request): int
    {
        return (int)$request->user->id;
    }
}
