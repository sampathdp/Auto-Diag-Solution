<?php

declare(strict_types=1);

namespace App\Exceptions;

/** 422 carrying a field => messages map, returned to the client in the `error` key. */
final class ValidationException extends DomainException
{
    /** @param array<string, string[]> $errors */
    public function __construct(private array $errors, string $message = 'Please check the highlighted fields.')
    {
        parent::__construct($message, 422);
    }

    /** @return array<string, string[]> */
    public function errors(): array
    {
        return $this->errors;
    }
}
