<?php

declare(strict_types=1);

namespace App\Exceptions;

/**
 * The only exception type whose getMessage() is safe to show directly to an end user
 * (e.g. "Invalid coupon code", "Product out of stock", "Payment temporarily unavailable").
 * Throw this from Services when a failure has a known, user-safe explanation.
 *
 * Anything else (PDOException, TypeError, third-party SDK exceptions, ...) is caught by
 * the global handler in public/index.php, logged in full server-side, and shown to the
 * user only as a single generic message — never the real internals.
 */
class DomainException extends \RuntimeException
{
    private int $statusCode;

    public function __construct(string $message, int $statusCode = 400)
    {
        parent::__construct($message);
        $this->statusCode = $statusCode;
    }

    public function getStatusCode(): int
    {
        return $this->statusCode;
    }
}
