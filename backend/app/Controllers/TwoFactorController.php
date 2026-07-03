<?php

declare(strict_types=1);

namespace App\Controllers;

use App\Core\Request;
use App\Core\Database\DatabaseManager;
use App\Services\TwoFactorService;

class TwoFactorController extends BaseController
{
    public function status(Request $request): void
    {
        TwoFactorService::ensureSchema();

        $row = DatabaseManager::query(
            "SELECT two_factor_enabled FROM users WHERE id = :id LIMIT 1",
            ['id' => $request->user->id]
        )->fetch();

        $this->success(['enabled' => (bool) ($row['two_factor_enabled'] ?? false)]);
    }

    public function setup(Request $request): void
    {
        $setup = TwoFactorService::generateSetup((int) $request->user->id);
        $this->success($setup);
    }

    public function confirm(Request $request): void
    {
        $code = (string) ($request->input('code') ?? '');
        $recoveryCodes = TwoFactorService::confirmSetup((int) $request->user->id, $code);

        if ($recoveryCodes === null) {
            $this->error('Invalid verification code', null, 400);
            return;
        }

        $this->success(['recovery_codes' => $recoveryCodes], 'Two-factor authentication enabled');
    }

    public function disable(Request $request): void
    {
        TwoFactorService::disable((int) $request->user->id);
        $this->success(null, 'Two-factor authentication disabled');
    }
}
