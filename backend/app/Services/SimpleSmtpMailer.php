<?php

declare(strict_types=1);

namespace App\Services;

class SimpleSmtpMailer
{
    /**
     * Remove CR/LF (and anything after them on the same value) to prevent
     * SMTP command / email header injection via untrusted input.
     */
    private static function stripHeaderInjection(string $value): string
    {
        return trim(str_replace(["\r", "\n"], '', $value));
    }

    /**
     * Write data to the socket in chunks to avoid buffer truncation.
     */
    private static function writeChunked($socket, string $data): void
    {
        $chunkSize = 4096;
        $offset    = 0;
        $length    = strlen($data);

        while ($offset < $length) {
            $chunk   = substr($data, $offset, $chunkSize);
            $written = fwrite($socket, $chunk);
            if ($written === false) {
                fclose($socket);
                throw new \Exception("Failed to write data to SMTP socket.");
            }
            $offset += $written;
        }
    }

    /**
     * Send email using a lightweight socket-based SMTP client.
     */
    public static function send(
        string  $host,
        int     $port,
        ?string $encryption,
        ?string $username,
        ?string $password,
        string  $fromAddress,
        string  $fromName,
        string  $to,
        string  $subject,
        string  $body,
        ?string $plainText   = null,
        ?string $icalContent = null
    ): void {
        // Strip CR/LF from every value that lands in an SMTP command or MIME header —
        // otherwise a caller passing attacker-controlled $to/$fromAddress/$fromName/$subject
        // could inject extra SMTP commands or forge additional headers (e.g. Bcc:).
        $fromAddress = self::stripHeaderInjection($fromAddress);
        $fromName    = self::stripHeaderInjection($fromName);
        $to          = self::stripHeaderInjection($to);
        $subject     = self::stripHeaderInjection($subject);

        $timeout = 15;
        $context = stream_context_create([
            'ssl' => [
                'verify_peer'       => false,
                'verify_peer_name'  => false,
                'allow_self_signed' => true,
            ],
        ]);

        $prefix = '';
        if ($encryption && strtolower($encryption) === 'ssl') {
            $prefix = 'ssl://';
        }

        $socket = @stream_socket_client(
            $prefix . $host . ':' . $port,
            $errno,
            $errstr,
            $timeout,
            STREAM_CLIENT_CONNECT,
            $context
        );

        if (!$socket) {
            throw new \Exception("Could not connect to SMTP server {$host}:{$port}: {$errstr} ({$errno})");
        }

        // ── Helpers ───────────────────────────────────────────────────────────

        $read = function () use ($socket): string {
            $response = '';
            while ($line = fgets($socket, 515)) {
                $response .= $line;
                if (substr($line, 3, 1) === ' ') {
                    break;
                }
            }
            return $response;
        };

        // Simple single-line command writer (for SMTP commands only, not DATA body)
        $write = function (string $command) use ($socket): void {
            fwrite($socket, $command . "\r\n");
        };

        // ── Greeting ──────────────────────────────────────────────────────────
        $response = $read();
        if (strpos($response, '220') !== 0) {
            fclose($socket);
            throw new \Exception("Server greeting failed: " . trim($response));
        }

        $write("EHLO localhost");
        $response = $read();
        if (strpos($response, '250') !== 0) {
            fclose($socket);
            throw new \Exception("EHLO failed: " . trim($response));
        }

        // ── STARTTLS ──────────────────────────────────────────────────────────
        if ($encryption && strtolower($encryption) === 'tls') {
            $write("STARTTLS");
            $response = $read();
            if (strpos($response, '220') !== 0) {
                fclose($socket);
                throw new \Exception("STARTTLS failed: " . trim($response));
            }

            $cryptoMethod = STREAM_CRYPTO_METHOD_TLS_CLIENT;
            if (defined('STREAM_CRYPTO_METHOD_TLSv1_2_CLIENT')) {
                $cryptoMethod = STREAM_CRYPTO_METHOD_TLSv1_2_CLIENT
                              | STREAM_CRYPTO_METHOD_TLSv1_3_CLIENT;
            }
            if (!@stream_socket_enable_crypto($socket, true, $cryptoMethod)) {
                fclose($socket);
                throw new \Exception("Failed to enable TLS encryption on stream.");
            }

            $write("EHLO localhost");
            $response = $read();
            if (strpos($response, '250') !== 0) {
                fclose($socket);
                throw new \Exception("EHLO failed after TLS upgrade: " . trim($response));
            }
        }

        // ── Authentication ────────────────────────────────────────────────────
        if ($username && $password) {
            $write("AUTH LOGIN");
            $response = $read();
            if (strpos($response, '334') !== 0) {
                fclose($socket);
                throw new \Exception("AUTH LOGIN command rejected: " . trim($response));
            }

            $write(base64_encode($username));
            $response = $read();
            if (strpos($response, '334') !== 0) {
                fclose($socket);
                throw new \Exception("Username rejected: " . trim($response));
            }

            $write(base64_encode($password));
            $response = $read();
            if (strpos($response, '235') !== 0) {
                fclose($socket);
                throw new \Exception("Authentication failed: " . trim($response));
            }
        }

        // ── Mail Transaction ──────────────────────────────────────────────────
        $write("MAIL FROM:<{$fromAddress}>");
        $response = $read();
        if (strpos($response, '250') !== 0) {
            fclose($socket);
            throw new \Exception("MAIL FROM command failed: " . trim($response));
        }

        $write("RCPT TO:<{$to}>");
        $response = $read();
        if (strpos($response, '250') !== 0 && strpos($response, '251') !== 0) {
            fclose($socket);
            throw new \Exception("RCPT TO command failed: " . trim($response));
        }

        $write("DATA");
        $response = $read();
        if (strpos($response, '354') !== 0) {
            fclose($socket);
            throw new \Exception("DATA command failed: " . trim($response));
        }

        // Fallback plain text if not provided
        if (empty($plainText)) {
            $plainText = strip_tags(
                str_replace(['<br>', '<br/>', '<p>', '</div>'], "\n", $body)
            );
        }

        // ── Build MIME message ────────────────────────────────────────────────
        //
        // HTML parts are encoded as base64 (instead of quoted-printable) to
        // avoid any line-length / encoding issues that can corrupt HTML tags
        // and cause Gmail to display raw "<img src=" text.
        //
        if (!empty($icalContent)) {
            // Structure for Gmail "Add to Calendar" + iOS/Android .ics attachment:
            //   multipart/mixed
            //     ├─ multipart/alternative
            //     │     ├─ text/plain
            //     │     ├─ text/html
            //     │     └─ text/calendar; method=REQUEST   ← Gmail event card
            //     └─ application/ics (attachment)          ← iOS/Outlook manual open

            $outerBoundary = "----=_OuterPart_" . md5((string) time()) . "_" . uniqid();
            $innerBoundary = "----=_InnerPart_" . md5((string) time() . 'i') . "_" . uniqid();

            $headers = [
                "MIME-Version: 1.0",
                "Content-Type: multipart/mixed; boundary=\"{$outerBoundary}\"",
                "From: =?UTF-8?B?" . base64_encode($fromName) . "?= <{$fromAddress}>",
                "To: <{$to}>",
                "Subject: =?UTF-8?B?" . base64_encode($subject) . "?=",
                "Date: " . date('r'),
                "Message-ID: <" . uniqid('', true) . "@{$host}>",
            ];

            $data  = implode("\r\n", $headers) . "\r\n\r\n";

            // Outer part 1: multipart/alternative wrapper
            $data .= "--{$outerBoundary}\r\n";
            $data .= "Content-Type: multipart/alternative; boundary=\"{$innerBoundary}\"\r\n\r\n";

            // Inner 1: plain text fallback
            $data .= "--{$innerBoundary}\r\n";
            $data .= "Content-Type: text/plain; charset=UTF-8\r\n";
            $data .= "Content-Transfer-Encoding: quoted-printable\r\n\r\n";
            $data .= quoted_printable_encode($plainText) . "\r\n\r\n";

            // Inner 2: HTML body (base64 — prevents tag corruption)
            $data .= "--{$innerBoundary}\r\n";
            $data .= "Content-Type: text/html; charset=UTF-8\r\n";
            $data .= "Content-Transfer-Encoding: base64\r\n\r\n";
            $data .= chunk_split(base64_encode($body), 76, "\r\n") . "\r\n\r\n";

            // Inner 3: text/calendar INLINE — Gmail parses this for event card
            $data .= "--{$innerBoundary}\r\n";
            $data .= "Content-Type: text/calendar; method=REQUEST; charset=UTF-8\r\n";
            $data .= "Content-Transfer-Encoding: base64\r\n\r\n";
            $data .= chunk_split(base64_encode($icalContent), 76, "\r\n") . "\r\n";
            $data .= "--{$innerBoundary}--\r\n\r\n";

            // Outer part 2: application/ics ATTACHMENT — iOS Mail, Outlook, Android
            $data .= "--{$outerBoundary}\r\n";
            $data .= "Content-Type: application/ics; name=\"invite.ics\"\r\n";
            $data .= "Content-Transfer-Encoding: base64\r\n";
            $data .= "Content-Disposition: attachment; filename=\"invite.ics\"\r\n\r\n";
            $data .= chunk_split(base64_encode($icalContent), 76, "\r\n") . "\r\n";
            $data .= "--{$outerBoundary}--";

        } else {
            $boundary = "----=_Part_" . md5((string) time()) . "_" . uniqid();

            $headers = [
                "MIME-Version: 1.0",
                "Content-Type: multipart/alternative; boundary=\"{$boundary}\"",
                "From: =?UTF-8?B?" . base64_encode($fromName) . "?= <{$fromAddress}>",
                "To: <{$to}>",
                "Subject: =?UTF-8?B?" . base64_encode($subject) . "?=",
                "Date: " . date('r'),
                "Message-ID: <" . uniqid('', true) . "@{$host}>",
            ];

            $data  = implode("\r\n", $headers) . "\r\n\r\n";

            // Part 1: plain text alternative
            $data .= "--{$boundary}\r\n";
            $data .= "Content-Type: text/plain; charset=UTF-8\r\n";
            $data .= "Content-Transfer-Encoding: quoted-printable\r\n\r\n";
            $data .= quoted_printable_encode($plainText) . "\r\n\r\n";

            // Part 2: HTML body (base64 — prevents tag corruption)
            $data .= "--{$boundary}\r\n";
            $data .= "Content-Type: text/html; charset=UTF-8\r\n";
            $data .= "Content-Transfer-Encoding: base64\r\n\r\n";
            $data .= chunk_split(base64_encode($body), 76, "\r\n") . "\r\n\r\n";

            $data .= "--{$boundary}--";
        }

        // ── RFC 5321 Dot-stuffing ─────────────────────────────────────────────
        // Any line that starts with "." must be doubled to prevent premature
        // DATA termination. Applied to the entire message string.
        $data = str_replace("\r\n.", "\r\n..", $data);

        // ── Send DATA in chunks (prevents silent socket buffer truncation) ─────
        // Writing the full $data in one fwrite() call can silently truncate on
        // large messages, which is what causes the raw "<img src=" display in Gmail.
        self::writeChunked($socket, $data . "\r\n");

        // End DATA with lone "."
        $write(".");
        $response = $read();
        if (strpos($response, '250') !== 0) {
            fclose($socket);
            throw new \Exception("Sending body data failed: " . trim($response));
        }

        $write("QUIT");
        fclose($socket);
    }
}