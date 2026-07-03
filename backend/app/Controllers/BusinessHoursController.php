<?php

declare(strict_types=1);

namespace App\Controllers;

use App\Core\Request;
use App\Repositories\BusinessHoursRepository;
use App\Core\Auth\TenantContext;

class BusinessHoursController extends BaseController
{
    private BusinessHoursRepository $repo;

    public function __construct()
    {
        $this->repo = new BusinessHoursRepository();
    }

    public function index(Request $request): void
    {
        $salonId = (int)TenantContext::getTenantId();
        $hours = $this->repo->getBySalon($salonId);
        
        // If no hours set yet, return defaults
        if (empty($hours)) {
            $hours = [];
            for ($i = 0; $i < 7; $i++) {
                $hours[] = [
                    'day_of_week' => $i,
                    'is_open' => true,
                    'open_time' => '08:00:00',
                    'close_time' => '18:00:00'
                ];
            }
        }

        $this->success($hours);
    }

    public function update(Request $request): void
    {
        $salonId = (int)TenantContext::getTenantId();
        $data = $request->all();
        $days = $data['days'] ?? [];

        try {
            foreach ($days as $dayData) {
                $day = (int)$dayData['day_of_week'];
                $this->repo->upsert($salonId, $day, [
                    'is_open' => (bool)$dayData['is_open'],
                    'open_time' => $dayData['open_time'],
                    'close_time' => $dayData['close_time']
                ]);
            }
            $this->success(null, "Business hours updated successfully.");
        } catch (\Exception $e) {
            $this->error($e->getMessage());
        }
    }
}
