<?php

declare(strict_types=1);

namespace App\Services\B2B;

use App\Services\Mail\EmailOutbox;
use App\Services\SettingService;

/**
 * Dealer emails (email only, no SMS). Everything is queued through EmailOutbox after
 * the business change has committed, so a mail problem never undoes an approval.
 * All dynamic values are HTML-escaped.
 */
class DealerMailer
{
    protected SettingService $settings;

    public function __construct()
    {
        $this->settings = new SettingService();
    }

    public function applicationReceived(array $profile, array $user): void
    {
        $name = $this->e($profile['business_name'] ?? $user['name']);
        $this->send(
            (string)$user['email'],
            'We received your dealer application',
            'dealer_application_received',
            "<p>Hi {$this->e($user['name'])},</p>
             <p>Thank you for applying to become a partner dealer with {$this->siteName()}. We have received the application for <strong>{$name}</strong>.</p>
             <p>Our team checks every application by hand, usually within 2 working days. We'll email you as soon as there is a decision. You can see the status at any time on the Become a Partner page: {$this->link('/partner')}</p>"
        );

        $admin = $this->adminLink('/admin/b2b/applications/' . (int)$profile['id']);
        foreach ($this->teamRecipients() as $to) {
            $this->send(
                $to,
                "New dealer application: " . ($profile['business_name'] ?? 'Unnamed business'),
                'dealer_application_admin',
                "<p>A new dealer application is waiting for review.</p>
                 <table cellpadding=\"4\">
                   <tr><td>Business</td><td><strong>{$name}</strong></td></tr>
                   <tr><td>Trade licence</td><td>{$this->e($profile['trade_licence_number'] ?? '')}</td></tr>
                   <tr><td>Emirate</td><td>{$this->e($profile['emirate'] ?? '')}</td></tr>
                   <tr><td>Contact</td><td>{$this->e($profile['business_email'] ?? $user['email'])} · {$this->e($profile['business_phone'] ?? '')}</td></tr>
                 </table>
                 <p>Review it here: {$admin}</p>"
            );
        }
    }

    public function infoRequested(array $profile, array $user, string $message): void
    {
        $this->send(
            (string)$user['email'],
            'We need a little more information for your dealer application',
            'dealer_info_requested',
            "<p>Hi {$this->e($user['name'])},</p>
             <p>We're reviewing the dealer application for <strong>{$this->e($profile['business_name'] ?? '')}</strong> and need the following before we can continue:</p>
             <blockquote style=\"border-left:3px solid #ccc;padding-left:12px;margin-left:0\">" . nl2br($this->e($message)) . "</blockquote>
             <p>Please update your application and submit it again: {$this->link('/partner/apply')}</p>"
        );
    }

    public function approved(array $profile, array $user, ?array $credit): void
    {
        $creditHtml = '<p><strong>Payment terms:</strong> payment is due on each order (Cash on Delivery, Bank Transfer or Cheque). No credit facility has been set up.</p>';
        if ($credit && (int)$credit['credit_enabled'] === 1) {
            $limit = number_format((float)$credit['credit_limit'], 2);
            $days = (int)$credit['credit_period_days'];
            $creditHtml = "<p><strong>Credit facility:</strong> limit AED {$limit}, payable within {$days} days of delivery.</p>";
        }
        if (!empty($credit['payment_terms'])) {
            $creditHtml .= '<p><strong>Additional terms:</strong> ' . $this->e((string)$credit['payment_terms']) . '</p>';
        }

        $activation = '';
        if (!empty($profile['activated_at']) && strtotime((string)$profile['activated_at']) > time()) {
            $activation = '<p>Your dealer account becomes active on <strong>' . $this->e(date('j M Y', strtotime((string)$profile['activated_at']))) . '</strong>.</p>';
        }

        $this->send(
            (string)$user['email'],
            'Your dealer account is approved',
            'dealer_approved',
            "<p>Hi {$this->e($user['name'])},</p>
             <p>Good news: <strong>{$this->e($profile['business_name'] ?? '')}</strong> is now an approved partner dealer.</p>
             <p><strong>Your dealer code:</strong> {$this->e($profile['dealer_code'] ?? '')}</p>
             {$creditHtml}
             {$activation}
             <p><strong>How to start:</strong> sign in with your usual email ({$this->e($user['email'])}) and password at {$this->link('/login')}. While signed in, the shop shows your dealer prices next to the retail price. Your first order is sent to us as a quotation, which our team confirms with you before it becomes an order.</p>"
        );
    }

    public function rejected(array $profile, array $user, string $reason, bool $canResubmit): void
    {
        $next = $canResubmit
            ? "<p>You can update your application and send it again: {$this->link('/partner/apply')}</p>"
            : '<p>If you think this is a mistake, reply to this email.</p>';
        $this->send(
            (string)$user['email'],
            'Update on your dealer application',
            'dealer_rejected',
            "<p>Hi {$this->e($user['name'])},</p>
             <p>Thank you for your interest. We can't approve the dealer application for <strong>{$this->e($profile['business_name'] ?? '')}</strong> at this time.</p>
             <p><strong>Reason:</strong><br>" . nl2br($this->e($reason)) . "</p>
             {$next}"
        );
    }

    public function suspended(array $profile, array $user, string $reason): void
    {
        $this->send(
            (string)$user['email'],
            'Your dealer account is on hold',
            'dealer_suspended',
            "<p>Hi {$this->e($user['name'])},</p>
             <p>The dealer account for <strong>{$this->e($profile['business_name'] ?? '')}</strong> ({$this->e($profile['dealer_code'] ?? '')}) has been put on hold. Dealer prices and dealer checkout are unavailable until it is reactivated. You can still shop at retail prices.</p>
             <p><strong>Reason:</strong><br>" . nl2br($this->e($reason)) . "</p>
             <p>Please contact us if you have questions.</p>"
        );
    }

    public function reactivated(array $profile, array $user): void
    {
        $this->send(
            (string)$user['email'],
            'Your dealer account is active again',
            'dealer_reactivated',
            "<p>Hi {$this->e($user['name'])},</p>
             <p>The dealer account for <strong>{$this->e($profile['business_name'] ?? '')}</strong> ({$this->e($profile['dealer_code'] ?? '')}) is active again. Sign in to see dealer prices: {$this->link('/login')}</p>"
        );
    }

    /** @return string[] */
    protected function teamRecipients(): array
    {
        $list = $this->settings->get('b2b_sales_team_emails', []);
        $list = is_array($list) ? array_values(array_filter(array_map('trim', array_map('strval', $list)))) : [];
        if (!$list) {
            $fallback = (string)($_ENV['CONTACT_NOTIFY_EMAIL'] ?? $_ENV['SMTP_FROM_ADDRESS'] ?? '');
            if ($fallback === '') {
                $fallback = (string)$this->settings->get('support_email', '');
            }
            $list = $fallback !== '' ? [$fallback] : [];
        }
        return array_values(array_unique(array_filter($list, fn ($e) => filter_var($e, FILTER_VALIDATE_EMAIL))));
    }

    protected function send(string $to, string $subject, string $template, string $bodyHtml): void
    {
        $site = $this->siteName();
        $html = "<div style=\"font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:1.6;color:#1a1a1a;max-width:600px\">
                   {$bodyHtml}
                   <p style=\"margin-top:24px;color:#666\">{$site}</p>
                 </div>";
        try {
            EmailOutbox::queue($to, $subject, $html, null, $template);
        } catch (\Throwable $e) {
            error_log("DealerMailer: could not queue {$template}: " . $e->getMessage());
        }
    }

    protected function siteName(): string
    {
        return $this->e((string)$this->settings->get('site_name', 'Auto Parts UAE'));
    }

    protected function link(string $path): string
    {
        $base = rtrim((string)($_ENV['FRONTEND_URL'] ?? 'http://localhost:3000'), '/');
        $url = $this->e($base . '/en' . $path);
        return "<a href=\"{$url}\">{$url}</a>";
    }

    protected function adminLink(string $path): string
    {
        $base = rtrim((string)($_ENV['FRONTEND_URL'] ?? 'http://localhost:3000'), '/');
        $url = $this->e($base . $path);
        return "<a href=\"{$url}\">{$url}</a>";
    }

    protected function e(?string $v): string
    {
        return htmlspecialchars((string)$v, ENT_QUOTES, 'UTF-8');
    }
}
