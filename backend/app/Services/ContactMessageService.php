<?php

declare(strict_types=1);

namespace App\Services;

use App\Exceptions\DomainException;
use App\Repositories\ContactMessageRepository;

class ContactMessageService
{
    private ContactMessageRepository $repo;

    public function __construct()
    {
        $this->repo = new ContactMessageRepository();
    }

    public function submit(array $input): array
    {
        $data = $this->validate($input);
        $id = $this->repo->create($data);

        // Best-effort notification — the message is already safely stored above, so a
        // down/unconfigured SMTP server shouldn't turn a successful submission into an
        // error for the customer (mirrors AuthController::forgotPassword's SMTP_HOST gate).
        $smtpHost = trim((string)($_ENV['SMTP_HOST'] ?? ''));
        if ($smtpHost !== '') {
            $teamEmail = (string)($_ENV['CONTACT_NOTIFY_EMAIL'] ?? $_ENV['SMTP_FROM_ADDRESS'] ?? '');
            if ($teamEmail !== '') {
                try {
                    $safeName = htmlspecialchars($data['name'], ENT_QUOTES, 'UTF-8');
                    $safeEmail = htmlspecialchars($data['email'], ENT_QUOTES, 'UTF-8');
                    $safeSubject = htmlspecialchars($data['subject'], ENT_QUOTES, 'UTF-8');
                    $safeMessage = nl2br(htmlspecialchars($data['message'], ENT_QUOTES, 'UTF-8'));
                    SimpleSmtpMailer::send(
                        $smtpHost,
                        (int)($_ENV['SMTP_PORT'] ?? 587),
                        $_ENV['SMTP_ENCRYPTION'] ?? 'tls',
                        $_ENV['SMTP_USER'] ?? null,
                        $_ENV['SMTP_PASS'] ?? null,
                        (string)($_ENV['SMTP_FROM_ADDRESS'] ?? 'no-reply@example.com'),
                        (string)($_ENV['SMTP_FROM_NAME'] ?? 'Auto Parts UAE'),
                        $teamEmail,
                        "New contact message: {$data['subject']}",
                        "<p><strong>From:</strong> {$safeName} ({$safeEmail})</p><p><strong>Subject:</strong> {$safeSubject}</p><p>{$safeMessage}</p>"
                    );
                } catch (\Throwable $e) {
                    // Swallow — see comment above.
                }
            }
        }

        return ['id' => $id];
    }

    private function validate(array $input): array
    {
        $name = trim((string)($input['name'] ?? ''));
        if ($name === '') {
            throw new DomainException('Name is required', 422);
        }

        $email = trim((string)($input['email'] ?? ''));
        if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
            throw new DomainException('A valid email address is required', 422);
        }

        $subject = trim((string)($input['subject'] ?? ''));
        if ($subject === '') {
            throw new DomainException('Subject is required', 422);
        }

        $message = trim((string)($input['message'] ?? ''));
        if (mb_strlen($message) < 10) {
            throw new DomainException('Message must be at least 10 characters', 422);
        }

        return [
            'name' => $name,
            'email' => $email,
            'subject' => $subject,
            'message' => $message,
        ];
    }
}
