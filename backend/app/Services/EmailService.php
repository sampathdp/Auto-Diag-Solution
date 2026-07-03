<?php

declare(strict_types=1);

namespace App\Services;

use App\Repositories\SettingsRepository;
use App\Core\Auth\TenantContext;

class EmailService
{
    private SettingsRepository $settingsRepo;

    public function __construct()
    {
        $this->settingsRepo = new SettingsRepository();
    }

    /**
     * Send email using saved settings for the current logged in salon
     */
    public function sendEmail(string $recipient, string $subject, string $message, ?array $calendarEvent = null): array
    {
        $salonId = TenantContext::getTenantId();
        if (!$salonId) {
            return ['success' => false, 'message' => 'Salon context missing.'];
        }
        return $this->sendEmailForSalon($salonId, $recipient, $subject, $message, $calendarEvent);
    }

    /**
     * Send platform-level system email (e.g. for trial approval credentials)
     */
    public function sendSystemEmail(string $recipient, string $subject, string $message): array
    {
        return $this->dispatch($recipient, $subject, $message, 0);
    }

    /**
     * Send email using saved settings for a specific salon ID
     */
    public function sendEmailForSalon(int $salonId, string $recipient, string $subject, string $message, ?array $calendarEvent = null): array
    {
        $settings = $this->settingsRepo->getAllKeyValueForSalon($salonId);
        $emailEnabled = $settings['email_enabled'] ?? '0';

        if ($emailEnabled !== '1') {
            $logDir = __DIR__ . '/../../scratch';
            if (!is_dir($logDir)) {
                mkdir($logDir, 0777, true);
            }
            $logFile = $logDir . '/emails.log';
            $msg = sprintf(
                "[%s] [Salon ID: %d] Skip email to %s: Email notifications are disabled.\n",
                date('Y-m-d H:i:s'),
                $salonId,
                $recipient
            );
            file_put_contents($logFile, $msg, FILE_APPEND);
            return ['success' => false, 'message' => 'Email notifications are disabled in settings.'];
        }

        if ($calendarEvent) {
            $salon = \App\Core\Database\DatabaseManager::query(
                "SELECT name, email, address, timezone FROM salons WHERE id = :id LIMIT 1",
                ['id' => $salonId]
            )->fetch();

            $salonName = $salon['name'] ?? 'Our Salon';
            $salonAddress = !empty($salon['address']) ? $salon['address'] : 'Our Salon';
            $salonTimezone = !empty($salon['timezone']) ? $salon['timezone'] : 'Asia/Colombo';

            // CRITICAL: organizerEmail MUST exactly match the SMTP_FROM_ADDRESS
            // Gmail validates this and will silently reject "Add to calendar" if they differ
            $organizerEmail = $_ENV['SMTP_FROM_ADDRESS'] ?? 'no-reply@salonsystem.lk';

            $title = $calendarEvent['title'] ?? 'Salon Appointment';
            $date = $calendarEvent['date'] ?? date('Y-m-d');
            $time = $calendarEvent['time'] ?? date('H:i:s');
            $duration = (int) ($calendarEvent['duration'] ?? 30);
            $description = $calendarEvent['description'] ?? 'Your appointment is confirmed.';

            $googleUrl = $this->generateGoogleCalendarUrl(
                $title,
                $date,
                $time,
                $duration,
                $description,
                $salonAddress,
                $salonTimezone
            );

            $subject = str_replace('{google_calendar_link}', $googleUrl, $subject);
            $message = str_replace('{google_calendar_link}', $googleUrl, $message);

            $customerName = $calendarEvent['customer_name'] ?? 'Customer';
            $customerEmail = $calendarEvent['customer_email'] ?? $recipient;

            $uid = "salon-appt-" . $salonId . "-" . uniqid() . "@salonsystem.lk";
            $icalContent = $this->generateIcalString(
                $uid,
                $title,
                $date,
                $time,
                $duration,
                $description,
                $salonAddress,
                $salonName,
                $organizerEmail,   // <-- always matches SMTP From address
                $salonTimezone,
                $customerName,
                $customerEmail     // <-- always matches To address
            );

            $calendarEvent['ical_content'] = $icalContent;
            $calendarEvent['organizer_email'] = $organizerEmail;
        }

        return $this->dispatch($recipient, $subject, $message, $salonId, $calendarEvent);
    }

    /**
     * Format a template by replacing placeholders with actual values
     */
    public function formatTemplate(string $template, array $placeholders): string
    {
        $search = [];
        $replace = [];
        foreach ($placeholders as $key => $value) {
            $search[] = '{' . $key . '}';
            $replace[] = $value;
        }
        return str_replace($search, $replace, $template);
    }

    /**
     * Internal email dispatch
     */
    private function dispatch(string $recipient, string $subject, string $message, int $salonId, ?array $calendarEvent = null): array
    {
        $plainText = $message;
        // Auto-wrap in HTML template only if the message is pure plain text.
        // Detect any HTML — not just <html>/<DOCTYPE — so partial-HTML templates
        // (e.g. those containing <img>, <p>, <div>) are not double-escaped.
        $looksLikeHtml = (bool) preg_match('/<[a-z][^>]*>/i', $message)
            || strpos($message, '<!DOCTYPE') !== false;
        if (!$looksLikeHtml) {
            $message = $this->wrapInHtmlTemplate($message, $subject, $salonId);
        } else {
            // Strip HTML tags for fallback plain text
            $plainText = strip_tags(str_replace(['<br>', '<br/>', '<p>', '</div>'], "\n", $message));
            // If not a full document, wrap in the branded template so it gets
            // the header/footer/logo — but pass it pre-escaped-safe as raw HTML.
            if (strpos($message, '<html>') === false && strpos($message, '<!DOCTYPE') === false) {
                $message = $this->wrapPartialHtml($message, $subject, $salonId);
            }
        }

        $logDir = __DIR__ . '/../../scratch';
        if (!is_dir($logDir)) {
            mkdir($logDir, 0777, true);
        }
        $logFile = $logDir . '/emails.log';

        $icalContent = $calendarEvent['ical_content'] ?? null;
        $logEntry = sprintf(
            "[%s] [Salon ID: %d] To: %s | Subject: %s\n",
            date('Y-m-d H:i:s'),
            $salonId,
            $recipient,
            $subject
        );
        $logEntry .= "--------------------------------------------------\n";
        file_put_contents($logFile, $logEntry, FILE_APPEND);

        $smtpHost = $_ENV['SMTP_HOST'] ?? null;

        if (!empty($smtpHost)) {
            $smtpPort = (int) ($_ENV['SMTP_PORT'] ?? 25);
            $smtpEncryption = $_ENV['SMTP_ENCRYPTION'] ?? null;
            $smtpUser = $_ENV['SMTP_USER'] ?? null;
            $smtpPass = $_ENV['SMTP_PASS'] ?? null;
            $fromAddress = $_ENV['SMTP_FROM_ADDRESS'] ?? 'no-reply@salonsystem.lk';
            $fromName = $_ENV['SMTP_FROM_NAME'] ?? 'SalonFlow';

            try {
                SimpleSmtpMailer::send(
                    $smtpHost,
                    $smtpPort,
                    $smtpEncryption,
                    $smtpUser,
                    $smtpPass,
                    $fromAddress,
                    $fromName,
                    $recipient,
                    $subject,
                    $message,
                    $plainText,
                    $icalContent
                );

                $successLog = sprintf(
                    "[%s] SMTP SUCCESS: Email sent to %s via %s:%d\n",
                    date('Y-m-d H:i:s'),
                    $recipient,
                    $smtpHost,
                    $smtpPort
                );
                file_put_contents($logFile, $successLog, FILE_APPEND);

                return ['success' => true, 'message' => 'Email sent successfully via SMTP.', 'logged' => true, 'sent_via_smtp' => true];
            } catch (\Exception $e) {
                $errorLog = sprintf("[%s] SMTP FAILED to %s: %s\n", date('Y-m-d H:i:s'), $recipient, $e->getMessage());
                file_put_contents($logFile, $errorLog, FILE_APPEND);
                return ['success' => false, 'message' => 'Failed to send SMTP email: ' . $e->getMessage(), 'logged' => true, 'sent_via_smtp' => false];
            }
        }

        // Fallback: PHP mail() using multipart/alternative
        $boundary = "----=_Part_" . md5((string) time()) . "_" . uniqid();
        $headerStr = "From: no-reply@salonsystem.lk\r\n" .
            "Reply-To: no-reply@salonsystem.lk\r\n" .
            "X-Mailer: PHP/" . phpversion() . "\r\n" .
            "MIME-Version: 1.0\r\n" .
            "Content-Type: multipart/alternative; boundary=\"{$boundary}\"\r\n";

        $mailBody = "--{$boundary}\r\n" .
            "Content-Type: text/plain; charset=UTF-8\r\n" .
            "Content-Transfer-Encoding: quoted-printable\r\n\r\n" .
            quoted_printable_encode($plainText) . "\r\n\r\n" .
            "--{$boundary}\r\n" .
            "Content-Type: text/html; charset=UTF-8\r\n" .
            "Content-Transfer-Encoding: quoted-printable\r\n\r\n" .
            quoted_printable_encode($message) . "\r\n\r\n" .
            "--{$boundary}--";

        $mailSent = @mail($recipient, $subject, $mailBody, $headerStr);

        $mailLog = sprintf(
            "[%s] PHP mail() RESULT: %s for recipient %s\n",
            date('Y-m-d H:i:s'),
            $mailSent ? 'SUCCESS' : 'FAILED',
            $recipient
        );
        file_put_contents($logFile, $mailLog, FILE_APPEND);

        return ['success' => true, 'message' => 'Email processed via PHP mail().', 'logged' => true, 'sent_via_mail' => $mailSent];
    }

    /**
     * Generate a Google Calendar event URL
     */
    public function generateGoogleCalendarUrl(
        string $title,
        string $date,
        string $time,
        int $durationMinutes,
        string $description,
        string $location,
        string $timezoneName
    ): string {
        try {
            $tz = new \DateTimeZone($timezoneName);
        } catch (\Exception $e) {
            $tz = new \DateTimeZone('Asia/Colombo');
        }

        $start = new \DateTime($date . ' ' . $time, $tz);
        $startUtc = clone $start;
        $startUtc->setTimezone(new \DateTimeZone('UTC'));
        $end = clone $start;
        $end->modify("+$durationMinutes minutes");
        $endUtc = clone $end;
        $endUtc->setTimezone(new \DateTimeZone('UTC'));

        $dates = $startUtc->format('Ymd\THis\Z') . '/' . $endUtc->format('Ymd\THis\Z');

        return "https://calendar.google.com/calendar/render?" . http_build_query([
            'action' => 'TEMPLATE',
            'text' => $title,
            'dates' => $dates,
            'details' => $description,
            'location' => $location,
            'sf' => 'true',
            'output' => 'xml',
        ]);
    }

    /**
     * Generate iCalendar (.ics) string.
     *
     * KEY RULES for Gmail "Add to calendar" to work:
     *   1. ORGANIZER mailto: must exactly match the email From: header
     *   2. ATTENDEE  mailto: must exactly match the email To: header
     *   3. METHOD:REQUEST must be present
     *   4. DTSTART/DTEND must be UTC (Z suffix) — not local TZID
     */
    public function generateIcalString(
        string $uid,
        string $title,
        string $date,
        string $time,
        int $durationMinutes,
        string $description,
        string $location,
        string $organizerName,
        string $organizerEmail,   // MUST match SMTP_FROM_ADDRESS exactly
        string $timezoneName,
        string $customerName = 'Customer',
        string $customerEmail = ''  // MUST match recipient (To:) exactly
    ): string {
        try {
            $tz = new \DateTimeZone($timezoneName);
        } catch (\Exception $e) {
            $tz = new \DateTimeZone('Asia/Colombo');
            $timezoneName = 'Asia/Colombo';
        }

        $start = new \DateTime($date . ' ' . $time, $tz);
        $startUtc = clone $start;
        $startUtc->setTimezone(new \DateTimeZone('UTC'));
        $end = clone $start;
        $end->modify("+{$durationMinutes} minutes");
        $endUtc = clone $end;
        $endUtc->setTimezone(new \DateTimeZone('UTC'));
        $nowUtc = new \DateTime('now', new \DateTimeZone('UTC'));

        $dtStart = $startUtc->format('Ymd\THis\Z');
        $dtEnd = $endUtc->format('Ymd\THis\Z');
        $dtStamp = $nowUtc->format('Ymd\THis\Z');

        // RFC 5545 line folding (max 75 octets, continuation lines start with a space)
        $fold = function (string $line): string {
            if (strlen($line) <= 75) {
                return $line;
            }
            $out = substr($line, 0, 75);
            $rest = substr($line, 75);
            while ($rest !== '') {
                $out .= "\r\n " . substr($rest, 0, 74);
                $rest = substr($rest, 74);
            }
            return $out;
        };

        $ics = "BEGIN:VCALENDAR\r\n";
        $ics .= "VERSION:2.0\r\n";
        $ics .= "PRODID:-//SalonFlow//Calendar Event//EN\r\n";
        $ics .= "CALSCALE:GREGORIAN\r\n";
        $ics .= "METHOD:REQUEST\r\n";
        $ics .= "X-WR-CALNAME:SalonFlow\r\n";
        $ics .= "X-WR-TIMEZONE:{$timezoneName}\r\n";

        $ics .= "BEGIN:VEVENT\r\n";
        $ics .= "UID:{$uid}\r\n";
        $ics .= "DTSTAMP:{$dtStamp}\r\n";
        $ics .= "DTSTART:{$dtStart}\r\n";
        $ics .= "DTEND:{$dtEnd}\r\n";
        $ics .= $fold("SUMMARY:" . $this->escapeIcalText($title)) . "\r\n";
        $ics .= $fold("DESCRIPTION:" . $this->escapeIcalText($description)) . "\r\n";
        $ics .= $fold("LOCATION:" . $this->escapeIcalText($location)) . "\r\n";

        // ORGANIZER: must match From: address in the email headers exactly
        $ics .= $fold(
            "ORGANIZER;CN=\"" . $this->escapeIcalText($organizerName) . "\":mailto:{$organizerEmail}"
        ) . "\r\n";

        // ATTENDEE: must match To: address in the email headers exactly
        if (!empty($customerEmail)) {
            $ics .= $fold(
                "ATTENDEE;CUTYPE=INDIVIDUAL;ROLE=REQ-PARTICIPANT;PARTSTAT=NEEDS-ACTION;"
                . "RSVP=TRUE;CN=\"" . $this->escapeIcalText($customerName) . "\":"
                . "mailto:{$customerEmail}"
            ) . "\r\n";
        }

        // VALARM: triggers a push notification 1 hour before the event on iOS and Android
        $ics .= "BEGIN:VALARM\r\n";
        $ics .= "TRIGGER:-PT1H\r\n";
        $ics .= "ACTION:DISPLAY\r\n";
        $ics .= $fold("DESCRIPTION:Reminder: " . $this->escapeIcalText($title)) . "\r\n";
        $ics .= "END:VALARM\r\n";

        $ics .= "SEQUENCE:0\r\n";
        $ics .= "STATUS:CONFIRMED\r\n";
        $ics .= "TRANSP:OPAQUE\r\n";
        $ics .= "END:VEVENT\r\n";
        $ics .= "END:VCALENDAR";

        return $ics;
    }

    /**
     * Escape special characters per RFC 5545
     */
    private function escapeIcalText(string $text): string
    {
        $text = str_replace('\\', '\\\\', $text);
        $text = str_replace(';', '\;', $text);
        $text = str_replace(',', '\,', $text);
        $text = str_replace(["\r\n", "\n", "\r"], '\\n', $text);
        return $text;
    }

    /**
     * Wrap plain text email message in a premium, responsive HTML template with salon branding/logo.
     */
    public function wrapInHtmlTemplate(string $plainText, string $subject, int $salonId): string
    {
        $primaryColor = '#6366f1';
        $salonName = 'SalonFlow';
        $salonEmail = 'info@salonflow.cloud';
        $salonPhone = '';
        $salonAddress = 'Colombo, Sri Lanka';
        $logoUrl = '';
        $isSystem = ($salonId === 0);

        if (!$isSystem) {
            try {
                $salon = \App\Core\Database\DatabaseManager::query(
                    "SELECT s.name, s.email, s.phone, s.address, sa.logo, sa.primary_color 
                 FROM salons s 
                 LEFT JOIN salon_appearances sa ON s.id = sa.salon_id 
                 WHERE s.id = :id LIMIT 1",
                    ['id' => $salonId]
                )->fetch();

                if ($salon) {
                    if (!empty($salon['name'])) {
                        $salonName = $salon['name'];
                    }
                    if (!empty($salon['email'])) {
                        $salonEmail = $salon['email'];
                    }
                    if (!empty($salon['phone'])) {
                        $salonPhone = $salon['phone'];
                    }
                    if (!empty($salon['address'])) {
                        $salonAddress = $salon['address'];
                    }
                    if (!empty($salon['primary_color'])) {
                        $primaryColor = $salon['primary_color'];
                    }

                    if (!empty($salon['logo'])) {
                        $logoPath = $salon['logo'];
                        if (strpos($logoPath, 'data:') === 0) {
                            // Data URI — embedding base64 in email makes it huge and causes
                            // Gmail's 102 KB clip.  Fall back to the initials circle instead.
                            $logoUrl = '';
                        } elseif (strpos($logoPath, 'http://') === 0 || strpos($logoPath, 'https://') === 0) {
                            $logoUrl = $logoPath;
                        } else {
                            $appUrl = rtrim($_ENV['APP_URL'] ?? 'https://salonflow.cloud', '/');
                            $logoUrl = $appUrl . '/' . ltrim($logoPath, '/');
                        }
                    }
                }
            } catch (\Exception $e) {
                // Keep defaults if query fails
            }
        }

        // ── Logo / initials block ─────────────────────────────────────────────────
        // No emoji, no box-shadow, no overflow:hidden
        if (!empty($logoUrl)) {
            $logoHeader = '<div style="text-align:center;margin-bottom:12px;">'
                . '<img src="' . htmlspecialchars($logoUrl) . '" alt="' . htmlspecialchars($salonName) . '" '
                . 'style="max-height:64px;max-width:180px;border-radius:4px;">'
                . '</div>';
        } elseif ($isSystem) {
            $logoHeader = '<div style="text-align:center;margin-bottom:12px;">'
                . '<span style="display:inline-block;padding:6px 14px;border-radius:4px;'
                . 'background-color:#e0e7ff;color:#4f46e5;font-size:18px;font-weight:700;'
                . 'font-family:sans-serif;">SalonFlow</span>'
                . '</div>';
        } else {
            $initial = mb_strtoupper(mb_substr($salonName, 0, 1));
            $logoHeader = '<div style="text-align:center;margin-bottom:12px;">'
                . '<div style="display:inline-block;width:52px;height:52px;line-height:52px;'
                . 'border-radius:50%;background-color:' . $primaryColor . ';color:#ffffff;'
                . 'font-size:22px;font-weight:700;text-align:center;">'
                . htmlspecialchars($initial) . '</div>'
                . '</div>';
        }

        // ── Contact line ──────────────────────────────────────────────────────────
        $contactParts = [];
        if (!empty($salonPhone)) {
            $contactParts[] = $salonPhone;
        }
        if (!empty($salonEmail)) {
            $contactParts[] = $salonEmail;
        }
        $contactLine = implode('  |  ', $contactParts);

        // ── Body content ──────────────────────────────────────────────────────────
        $htmlContent = $this->convertPlainTextToHtml($plainText, $primaryColor);

        // ── Footer ────────────────────────────────────────────────────────────────
        if ($isSystem) {
            $footerHtml =
                '<p style="margin:0 0 4px 0;font-weight:600;color:#475569;">SalonFlow Support</p>'
                . '<p style="margin:0;">Colombo, Sri Lanka</p>'
                . '<p style="margin:16px 0 0 0;font-size:11px;color:#94a3b8;">'
                . '&copy; ' . date('Y') . ' SalonFlow. All rights reserved.<br>'
                . 'Questions? <a href="mailto:support@salonflow.cloud" '
                . 'style="color:#64748b;">support@salonflow.cloud</a>'
                . '</p>';
        } else {
            $addrLine = !empty($salonAddress)
                ? '<p style="margin:2px 0 0 0;">' . htmlspecialchars($salonAddress) . '</p>'
                : '';
            $footerHtml =
                '<p style="margin:0 0 4px 0;font-weight:600;color:#475569;">'
                . htmlspecialchars($salonName) . '</p>'
                . $addrLine
                . '<p style="margin:16px 0 0 0;font-size:11px;color:#94a3b8;">'
                . 'Sent via <a href="https://salonflow.cloud" style="color:#64748b;">SalonFlow</a>.</p>';
        }

        // ── Assemble ──────────────────────────────────────────────────────────────
        // CHANGES vs old version:
        //   • Removed border-top: 5px solid $primaryColor on the outer table (decorative, spam signal)
        //   • Removed box-shadow on the inner table
        //   • Removed overflow:hidden
        //   • border-radius reduced to 6px (safe threshold)
        $html = '<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1.0">
  <title>' . htmlspecialchars($subject) . '</title>
</head>
<body style="margin:0;padding:0;background-color:#f1f5f9;font-family:-apple-system,BlinkMacSystemFont,\'Segoe UI\',Roboto,Helvetica,Arial,sans-serif;color:#334155;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f1f5f9;padding:24px 0;">
    <tr>
      <td align="center">
        <table width="580" cellpadding="0" cellspacing="0"
               style="background-color:#ffffff;border-radius:6px;border:1px solid #e2e8f0;text-align:left;">
 
          <!-- Header -->
          <tr>
            <td style="padding:28px 28px 20px 28px;text-align:center;border-bottom:1px solid #f1f5f9;">
              ' . $logoHeader . '
              <h2 style="margin:8px 0 4px 0;font-size:20px;font-weight:700;color:#0f172a;">'
            . htmlspecialchars($salonName) . '</h2>
              <p style="margin:0;font-size:13px;color:#64748b;">'
            . htmlspecialchars($contactLine) . '</p>
            </td>
          </tr>
 
          <!-- Body -->
          <tr>
            <td style="padding:28px 28px;font-size:15px;line-height:1.65;color:#334155;">
              ' . $htmlContent . '
            </td>
          </tr>
 
          <!-- Footer -->
          <tr>
            <td style="padding:20px 28px;background-color:#f8fafc;border-top:1px solid #e2e8f0;
                        text-align:center;font-size:12px;color:#64748b;">
              ' . $footerHtml . '
            </td>
          </tr>
 
        </table>
      </td>
    </tr>
  </table>
</body>
</html>';

        return $html;
    }

    /**
     * Wrap a partial-HTML fragment (no <html>/<body> wrapper) in the branded email template.
     * Unlike wrapInHtmlTemplate(), the content is inserted as-is instead of being
     * passed through convertPlainTextToHtml(), so HTML tags are preserved.
     */
    private function wrapPartialHtml(string $htmlFragment, string $subject, int $salonId): string
    {
        // Re-use the same branding / logo / footer logic by temporarily injecting
        // the fragment as the $htmlContent variable inside the template.
        // We call wrapInHtmlTemplate() with a placeholder, then swap it out.
        $placeholder = '%%%PARTIAL_HTML_PLACEHOLDER%%%';
        $wrapped = $this->wrapInHtmlTemplate($placeholder, $subject, $salonId);
        // Replace the converted placeholder paragraph with the raw fragment
        return str_replace(
            '<p style="margin:0 0 14px 0;font-size:15px;line-height:1.65;color:#334155;">'
            . $placeholder . '</p>',
            $htmlFragment,
            $wrapped
        );
    }

    /**
     * Parse plain text paragraphs into modern styled HTML nodes (cards, highlight boxes, etc.)
     */
    private function convertPlainTextToHtml(string $text, string $primaryColor): string
    {
        $paragraphs = explode("\n\n", str_replace("\r\n", "\n", $text));
        $htmlParts = [];

        foreach ($paragraphs as $para) {
            $para = trim($para);
            if ($para === '') {
                continue;
            }

            // ── Key-value detail card ─────────────────────────────────────────────
            if (strpos($para, "\n") !== false) {
                $lines = explode("\n", $para);
                $isKeyValueBlock = true;
                $rows = [];

                foreach ($lines as $line) {
                    $line = trim($line);
                    if ($line === '' || strtolower($line) === 'details:') {
                        continue;
                    }
                    if (strpos($line, ':') !== false) {
                        [$label, $value] = explode(':', $line, 2);
                        $rows[] = ['label' => trim($label), 'value' => trim($value)];
                    } else {
                        $isKeyValueBlock = false;
                        break;
                    }
                }

                if ($isKeyValueBlock && !empty($rows)) {
                    // Clean card — no box-shadow, no text-transform, no letter-spacing
                    $card = '<table width="100%" cellpadding="0" cellspacing="0" '
                        . 'style="background-color:#f8fafc;border:1px solid #e2e8f0;'
                        . 'border-radius:4px;margin:16px 0;font-size:14px;border-collapse:collapse;">';
                    $card .= '<tr><td colspan="2" style="padding:10px 14px;font-size:12px;'
                        . 'font-weight:700;color:#64748b;border-bottom:1px solid #e2e8f0;">'
                        . 'Appointment Details</td></tr>';

                    foreach ($rows as $i => $row) {
                        $bg = ($i % 2 === 0) ? '#ffffff' : '#f8fafc';
                        $card .= '<tr style="background-color:' . $bg . ';">';
                        $card .= '<td width="38%" style="padding:9px 14px;font-weight:600;'
                            . 'color:#475569;vertical-align:top;">' . htmlspecialchars($row['label']) . '</td>';
                        $card .= '<td style="padding:9px 14px;color:#1e293b;vertical-align:top;">'
                            . htmlspecialchars($row['value']) . '</td>';
                        $card .= '</tr>';
                    }

                    $card .= '</table>';
                    $htmlParts[] = $card;
                    continue;
                }
            }

            // ── Verification code / password block ────────────────────────────────
            if (preg_match('/(?:Verification Code|Temporary Password|Password|Code):\s*([A-Za-z0-9\-]+)/i', $para, $matches)) {
                $codeLabel = 'Code';
                if (stripos($para, 'verification') !== false) {
                    $codeLabel = 'Verification Code';
                } elseif (stripos($para, 'password') !== false) {
                    $codeLabel = 'Temporary Password';
                }

                $codeVal = $matches[1];
                $cleanPara = trim(preg_replace(
                    '/(?:Verification Code|Temporary Password|Password|Code):\s*[A-Za-z0-9\-]+/i',
                    '',
                    $para
                ));

                $otpHtml = '';
                if ($cleanPara !== '') {
                    $otpHtml .= '<p style="margin:0 0 12px 0;font-size:15px;line-height:1.65;">'
                        . nl2br(htmlspecialchars($cleanPara)) . '</p>';
                }

                // Minimal OTP box — solid border (not dashed), no excessive decoration
                $otpHtml .= '<table width="100%" cellpadding="0" cellspacing="0" style="margin:16px 0;">'
                    . '<tr><td align="center">'
                    . '<p style="margin:0 0 6px 0;font-size:12px;font-weight:600;color:#64748b;">'
                    . htmlspecialchars($codeLabel) . '</p>'
                    . '<div style="display:inline-block;font-size:26px;font-weight:700;'
                    . 'color:' . $primaryColor . ';background-color:#f1f5f9;'
                    . 'padding:10px 24px;border-radius:4px;border:1px solid #cbd5e1;'
                    . 'font-family:monospace;">' . htmlspecialchars($codeVal) . '</div>'
                    . '</td></tr></table>';
                $htmlParts[] = $otpHtml;
                continue;
            }

            // ── Standard paragraph ────────────────────────────────────────────────
            $formattedText = nl2br(htmlspecialchars($para));

            // Plain link styling — no font-weight on anchor (phishing heuristic)
            $formattedText = preg_replace_callback(
                '/https?:\/\/[^\s<]+/i',
                static function (array $m) use ($primaryColor): string {
                    $url = $m[0];
                    $clean = rtrim($url, '.,;:!?');
                    $trail = substr($url, strlen($clean));
                    return '<a href="' . $clean . '" style="color:' . $primaryColor . ';text-decoration:underline;">'
                        . $clean . '</a>' . $trail;
                },
                $formattedText
            );

            $htmlParts[] = '<p style="margin:0 0 14px 0;font-size:15px;line-height:1.65;color:#334155;">'
                . $formattedText . '</p>';
        }

        return implode("\n", $htmlParts);
    }

}