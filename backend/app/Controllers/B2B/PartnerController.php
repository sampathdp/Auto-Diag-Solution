<?php

declare(strict_types=1);

namespace App\Controllers\B2B;

use App\Controllers\BaseController;
use App\Core\Request;
use App\Services\B2B\DealerApplicationService;

/** Public "Become a Partner" information (no login, no personal data). */
class PartnerController extends BaseController
{
    public function info(Request $request): void
    {
        $this->success((new DealerApplicationService())->publicInfo());
    }
}
