<?php

declare(strict_types=1);

namespace App\Controllers;

use App\Core\Request;
use App\Exceptions\DomainException;
use App\Services\ContactMessageService;
use App\Services\RateLimiter;

class ContactMessageController extends BaseController
{
    // Unauthenticated form open to the public internet — same abuse class as guest
    // checkout/registration, so it gets the same per-IP shape.
    private const IP_MAX_ATTEMPTS = 5;
    private const IP_LOCKOUT_SECONDS = 3600; // 1 hour

    private ContactMessageService $service;

    public function __construct()
    {
        $this->service = new ContactMessageService();
    }

    public function store(Request $request): void
    {
        $ip = $request->getIp();
        $lockedSeconds = RateLimiter::secondsUntilUnlocked('contact:ip', $ip);
        if ($lockedSeconds > 0) {
            throw new DomainException('Too many attempts. Try again in ' . (int)ceil($lockedSeconds / 60) . ' minute(s).', 429);
        }
        RateLimiter::hit('contact:ip', $ip, self::IP_MAX_ATTEMPTS, self::IP_LOCKOUT_SECONDS);

        $this->service->submit($request->all());
        $this->success(null, 'Message sent successfully', 201);
    }
}
