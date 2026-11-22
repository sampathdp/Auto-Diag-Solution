<?php

declare(strict_types=1);

namespace App\Services\Mail;

use App\Core\Database\DatabaseManager;

/**
 * Every outgoing email goes through here.
 *
 * queue() only inserts a notification_outbox row, so the HTTP request never waits on
 * SMTP and a mail failure can never roll back the business action that triggered it.
 * Rows queued during a request are delivered right after the response has been sent
 * (fastcgi_finish_request where available). Anything that fails there is retried by
 * the cron command `php console.php notifications:dispatch` with backoff, so cron is
 * a safety net rather than something normal delivery depends on.
 *
 * Call queue() AFTER the business transaction commits. If it is called inside a
 * transaction that later rolls back, the row disappears with it (which is correct).
 */
final class EmailOutbox
{
    public const MAX_ATTEMPTS = 5;
    private const STALE_SENDING_MINUTES = 10;

    /** @var int[] ids queued during this request, delivered at shutdown */
    private static array $pendingThisRequest = [];
    private static bool $shutdownRegistered = false;

    /**
     * @return int|null the outbox row id, or null when it fell back to a direct send
     *                  (outbox table missing, e.g. migrations not run yet)
     */
    public static function queue(string $to, string $subject, string $html, ?string $text = null, ?string $template = null): ?int
    {
        $to = trim($to);
        if ($to === '' || !filter_var($to, FILTER_VALIDATE_EMAIL)) {
            error_log("EmailOutbox: refusing to queue mail to invalid address for template " . ($template ?? 'none'));
            return null;
        }

        try {
            DatabaseManager::query(
                "INSERT INTO notification_outbox (channel, recipient, subject, body_html, body_text, template)
                 VALUES ('email', :recipient, :subject, :html, :text, :template)",
                [
                    'recipient' => $to,
                    'subject' => mb_substr($subject, 0, 255),
                    'html' => $html,
                    'text' => $text,
                    'template' => $template,
                ]
            );
            $id = (int)DatabaseManager::getLastInsertId();
        } catch (\Throwable $e) {
            // Outbox unavailable: never lose the email and never fail the caller.
            error_log('EmailOutbox: queue failed, sending directly: ' . $e->getMessage());
            try {
                if (Mailer::isConfigured()) {
                    Mailer::sendNow($to, $subject, $html, $text);
                }
            } catch (\Throwable $sendError) {
                error_log('EmailOutbox: direct send failed: ' . $sendError->getMessage());
            }
            return null;
        }

        self::$pendingThisRequest[] = $id;
        self::registerShutdownDelivery();
        return $id;
    }

    /**
     * Cron entry point. Re-queues rows stuck in 'sending' (a worker died mid-send), then
     * delivers due rows. Returns counts for the console output.
     *
     * @return array{sent:int, failed:int, retried:int, skipped:int}
     */
    public static function dispatchDue(int $limit = 50): array
    {
        DatabaseManager::query(
            "UPDATE notification_outbox SET status = 'pending', locked_at = NULL
             WHERE status = 'sending' AND locked_at < (NOW() - INTERVAL " . self::STALE_SENDING_MINUTES . " MINUTE)"
        );

        $ids = DatabaseManager::query(
            "SELECT id FROM notification_outbox
             WHERE status = 'pending' AND available_at <= NOW()
             ORDER BY id ASC LIMIT " . max(1, min(500, $limit))
        )->fetchAll(\PDO::FETCH_COLUMN);

        $stats = ['sent' => 0, 'failed' => 0, 'retried' => 0, 'skipped' => 0];
        foreach ($ids as $id) {
            $result = self::deliver((int)$id);
            if ($result !== null) {
                $stats[$result]++;
            }
        }
        return $stats;
    }

    /**
     * Claims one row (atomic status flip, so two workers never send the same mail) and
     * tries to send it.
     *
     * @return 'sent'|'failed'|'retried'|'skipped'|null  null = someone else claimed it
     */
    public static function deliver(int $id): ?string
    {
        $claimed = DatabaseManager::query(
            "UPDATE notification_outbox
             SET status = 'sending', locked_at = NOW(), attempts = attempts + 1
             WHERE id = :id AND status = 'pending' AND available_at <= NOW()",
            ['id' => $id]
        )->rowCount();
        if ($claimed !== 1) {
            return null;
        }

        $row = DatabaseManager::query("SELECT * FROM notification_outbox WHERE id = :id", ['id' => $id])->fetch();
        if (!$row) {
            return null;
        }

        if (!Mailer::isConfigured()) {
            DatabaseManager::query(
                "UPDATE notification_outbox SET status = 'skipped', locked_at = NULL, last_error = :err WHERE id = :id",
                ['id' => $id, 'err' => 'SMTP is not configured (SMTP_HOST is empty).']
            );
            return 'skipped';
        }

        try {
            Mailer::sendNow((string)$row['recipient'], (string)$row['subject'], (string)$row['body_html'], $row['body_text']);
            DatabaseManager::query(
                "UPDATE notification_outbox SET status = 'sent', sent_at = NOW(), locked_at = NULL, last_error = NULL WHERE id = :id",
                ['id' => $id]
            );
            return 'sent';
        } catch (\Throwable $e) {
            $attempts = (int)$row['attempts'];
            $error = mb_substr($e->getMessage(), 0, 2000);
            if ($attempts >= self::MAX_ATTEMPTS) {
                DatabaseManager::query(
                    "UPDATE notification_outbox SET status = 'failed', locked_at = NULL, last_error = :err WHERE id = :id",
                    ['id' => $id, 'err' => $error]
                );
                error_log("EmailOutbox: #{$id} failed permanently: {$error}");
                return 'failed';
            }
            // Backoff: 1, 4, 9, 16 minutes.
            $delay = $attempts * $attempts;
            DatabaseManager::query(
                "UPDATE notification_outbox
                 SET status = 'pending', locked_at = NULL, last_error = :err, available_at = (NOW() + INTERVAL {$delay} MINUTE)
                 WHERE id = :id",
                ['id' => $id, 'err' => $error]
            );
            return 'retried';
        }
    }

    /** Admin "resend" for a failed or skipped row. */
    public static function requeue(int $id): bool
    {
        return DatabaseManager::query(
            "UPDATE notification_outbox SET status = 'pending', attempts = 0, available_at = NOW(), last_error = NULL
             WHERE id = :id AND status IN ('failed','skipped')",
            ['id' => $id]
        )->rowCount() === 1;
    }

    private static function registerShutdownDelivery(): void
    {
        if (self::$shutdownRegistered || PHP_SAPI === 'cli') {
            return;
        }
        self::$shutdownRegistered = true;

        register_shutdown_function(static function (): void {
            // Close the connection to the browser first, so the user isn't kept waiting.
            if (function_exists('fastcgi_finish_request')) {
                @fastcgi_finish_request();
            } elseif (function_exists('litespeed_finish_request')) {
                @litespeed_finish_request();
            }
            ignore_user_abort(true);
            @set_time_limit(60);

            foreach (self::$pendingThisRequest as $id) {
                try {
                    self::deliver($id);
                } catch (\Throwable $e) {
                    // Row stays pending/sending; cron picks it up.
                    error_log('EmailOutbox: shutdown delivery error: ' . $e->getMessage());
                }
            }
            self::$pendingThisRequest = [];
        });
    }
}
