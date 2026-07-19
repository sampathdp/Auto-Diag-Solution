<?php

declare(strict_types=1);

namespace App\Controllers;

use App\Core\Request;
use App\Services\AccountService;

class AccountController extends BaseController
{
    private AccountService $service;

    public function __construct()
    {
        $this->service = new AccountService();
    }

    public function me(Request $request): void
    {
        $this->success($this->service->getProfile((int)$request->user->id));
    }

    public function update(Request $request): void
    {
        $profile = $this->service->updateProfile((int)$request->user->id, $request->all());
        $this->success($profile, 'Profile updated successfully');
    }

    public function changePassword(Request $request): void
    {
        $this->service->changePassword(
            (int)$request->user->id,
            (string)$request->input('current_password'),
            (string)$request->input('new_password')
        );
        $this->success(null, 'Password changed successfully');
    }

    public function destroy(Request $request): void
    {
        $this->service->deleteAccount((int)$request->user->id);
        $this->success(null, 'Account deleted successfully');
    }
}
