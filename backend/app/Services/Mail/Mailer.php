<?php

declare(strict_types=1);

namespace App\Services\Mail;

use App\Services\SimpleSmtpMailer;

/** Thin wrapper that reads SMTP settings from .env once, so callers don't repeat them. */
final class Mailer
{
    public static function isConfigured(): bool
    {
        return trim((string)($_ENV['SMTP_HOST'] ?? '')) !== '';
    }

    /** Sends immediately. Throws on any SMTP failure. */
    public static function sendNow(string $to, string $subject, string $html, ?string $text = null): void
    {
        if (!self::isConfigured()) {
            throw new \RuntimeException('SMTP is not configured (SMTP_HOST is empty).');
        }

        SimpleSmtpMailer::send(
            trim((string)$_ENV['SMTP_HOST']),
            (int)($_ENV['SMTP_PORT'] ?? 587),
            $_ENV['SMTP_ENCRYPTION'] ?? 'tls',
            $_ENV['SMTP_USER'] ?? null,
            $_ENV['SMTP_PASS'] ?? null,
            (string)($_ENV['SMTP_FROM_ADDRESS'] ?? 'no-reply@example.com'),
            (string)($_ENV['SMTP_FROM_NAME'] ?? 'Auto Parts UAE'),
            $to,
            $subject,
            $html,
            $text
        );
    }
}
