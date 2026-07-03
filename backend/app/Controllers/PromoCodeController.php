<?php

declare(strict_types=1);

namespace App\Controllers;

use App\Core\Request;
use App\Services\PromoCodeService;

class PromoCodeController extends BaseController
{
    private PromoCodeService $promoService;

    public function __construct()
    {
        $this->promoService = new PromoCodeService();
    }

    // Admin: list all promo codes
    public function index(Request $request): void
    {
        $this->success($this->promoService->getAll());
    }

    // Admin: create a promo code
    public function store(Request $request): void
    {
        try {
            $adminId = (int) ($request->user->id ?? 0);
            $id = $this->promoService->create($request->all(), $adminId);
            $this->success(['id' => $id], 'Promo code created successfully', 201);
        } catch (\Exception $e) {
            $this->error($e->getMessage());
        }
    }

    // Admin: update a promo code
    public function update(Request $request): void
    {
        $id = (int) $request->getParam('id');
        try {
            $this->promoService->update($id, $request->all());
            $this->success(null, 'Promo code updated successfully');
        } catch (\Exception $e) {
            $this->error($e->getMessage());
        }
    }

    // Admin: delete a promo code
    public function destroy(Request $request): void
    {
        $id = (int) $request->getParam('id');
        try {
            $this->promoService->delete($id);
            $this->success(null, 'Promo code deleted successfully');
        } catch (\Exception $e) {
            $this->error($e->getMessage());
        }
    }

    // Public: live-validate a code during signup (does not redeem it)
    public function validateCode(Request $request): void
    {
        try {
            $code = (string) ($request->input('code') ?? '');
            $promo = $this->promoService->validateCode($code);
            $this->success([
                'code' => $promo['code'],
                'discount_percent' => (float) $promo['discount_percent'],
                'duration_months' => $promo['duration_months'] !== null ? (int) $promo['duration_months'] : null,
            ], 'Promo code applied!');
        } catch (\Exception $e) {
            $this->error($e->getMessage());
        }
    }
}
