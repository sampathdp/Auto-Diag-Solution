<?php

declare(strict_types=1);

namespace App\Controllers;

use App\Core\Request;
use App\Services\AccountOrderService;

class AccountOrderController extends BaseController
{
    private AccountOrderService $service;

    public function __construct()
    {
        $this->service = new AccountOrderService();
    }

    public function index(Request $request): void
    {
        $page = max(1, (int)($request->input('page') ?? 1));
        $perPage = min(50, max(1, (int)($request->input('per_page') ?? 10)));
        $status = (string)($request->input('status') ?? 'all');
        $dateRange = (string)($request->input('date_range') ?? 'all');
        $search = trim((string)($request->input('q') ?? ''));

        $result = $this->service->list((int)$request->user->id, $status, $dateRange, $search, $page, $perPage);

        $this->success([
            'items' => $result['items'],
            'meta' => [
                'page' => $page,
                'per_page' => $perPage,
                'total' => $result['total'],
                'total_pages' => (int)ceil($result['total'] / $perPage),
            ],
        ]);
    }

    public function show(Request $request): void
    {
        $this->success($this->service->show((int)$request->user->id, (int)$request->getParam('id')));
    }

    public function cancel(Request $request): void
    {
        $order = $this->service->cancel(
            (int)$request->user->id,
            (int)$request->getParam('id'),
            $request->input('reason')
        );
        $this->success($order, 'Order cancelled successfully');
    }

    public function refund(Request $request): void
    {
        $order = $this->service->requestRefund(
            (int)$request->user->id,
            (int)$request->getParam('id'),
            (string)($request->input('reason') ?? ''),
            (string)($request->input('description') ?? ''),
            (array)($request->input('items') ?? []),
            (array)($request->input('photos') ?? [])
        );
        $this->success($order, 'Refund request submitted successfully');
    }

    public function uploadRefundPhoto(Request $request): void
    {
        $files = $request->getFiles();
        if (empty($files['file'])) {
            $this->error('No file provided', null, 400);
            return;
        }

        $url = $this->service->uploadRefundPhoto($files['file']);
        $this->success(['url' => $url], 'Photo uploaded successfully', 201);
    }

    /** POST /account/orders/{id}/payment-proof  (multipart: file) */
    public function uploadPaymentProof(Request $request): void
    {
        $files = $request->getFiles();
        $order = $this->service->uploadPaymentProof(
            (int)$request->user->id,
            (int)$request->getParam('id'),
            $files['file'] ?? null
        );
        $this->success($order, 'Receipt uploaded. We will verify your payment shortly.', 201);
    }

    public function reorder(Request $request): void
    {
        $result = $this->service->reorder((int)$request->user->id, (int)$request->getParam('id'));
        $this->success($result);
    }
}
