<?php

declare(strict_types=1);

namespace App\Services;

/** Sends the order-confirmation email once an order is placed (see CheckoutService::createOrder).
 * Transport is whatever SMTP_HOST is configured with — including Resend's SMTP relay
 * (smtp.resend.com, username "resend", password = API key) — since SimpleSmtpMailer
 * already speaks plain SMTP and doesn't care which provider is on the other end. */
class OrderMailService
{
    /**
     * @param array<int, array{name_en:string,sku:string,quantity:int,unit_price:float,line_total:float}> $items
     * @param array{method:string,label:string,bank_transfer:?array} $payment how the buyer pays, with bank details for transfers
     */
    public static function sendOrderConfirmation(
        array $order,
        array $items,
        string $customerName,
        string $customerEmail,
        string $trackingUrl,
        array $payment
    ): void {
        if ($customerEmail === '') {
            // No email to send to (e.g. malformed guest data that somehow got past
            // validation) — checkout must never fail because of this.
            return;
        }

        try {
            // Queued, not sent inline: delivered right after the response, retried by cron.
            Mail\EmailOutbox::queue(
                $customerEmail,
                "Order Confirmed — {$order['order_number']}",
                self::buildHtml($order, $items, $customerName, $trackingUrl, $payment),
                null,
                'order_confirmation'
            );
        } catch (\Throwable $e) {
            // A failed email must never roll back or fail an already-placed order —
            // the order is the source of truth, the email is a courtesy notification.
            error_log('Order confirmation email failed for ' . $order['order_number'] . ': ' . $e->getMessage());
        }
    }

    private static function buildHtml(array $order, array $items, string $customerName, string $trackingUrl, array $payment): string
    {
        $e = static fn ($v): string => htmlspecialchars((string)$v, ENT_QUOTES, 'UTF-8');
        $safeName = $e($customerName);
        $orderNumber = $e($order['order_number']);
        $currency = $e($order['currency'] ?? 'AED');
        $safeUrl = $e($trackingUrl);

        $rows = '';
        foreach ($items as $item) {
            $name = $e($item['name_en']);
            $qty = (int)$item['quantity'];
            $lineTotal = number_format((float)$item['line_total'], 2);
            $rows .= "<tr>"
                . "<td style=\"padding:8px 0;border-bottom:1px solid #eee;\">{$name}<br><span style=\"color:#888;font-size:12px;\">Qty: {$qty}</span></td>"
                . "<td style=\"padding:8px 0;border-bottom:1px solid #eee;text-align:right;\">{$currency} {$lineTotal}</td>"
                . "</tr>";
        }

        $total = number_format((float)$order['total'], 2);
        $intro = $payment['method'] === 'mock'
            ? "Order #{$orderNumber} has been placed and payment confirmed."
            : "Order #{$orderNumber} has been placed.";
        $paymentBlock = self::paymentBlock($payment, $orderNumber, $currency, $total, $e);

        return <<<HTML
            <div style="font-family:Arial,sans-serif;max-width:520px;margin:0 auto;color:#222;">
                <h2 style="margin-bottom:4px;">Thanks for your order, {$safeName}!</h2>
                <p style="color:#555;margin-top:0;">{$intro}</p>
                <table style="width:100%;border-collapse:collapse;margin:16px 0;">
                    {$rows}
                    <tr>
                        <td style="padding:12px 0 0;font-weight:bold;">Total</td>
                        <td style="padding:12px 0 0;font-weight:bold;text-align:right;">{$currency} {$total}</td>
                    </tr>
                </table>
                {$paymentBlock}
                <p style="text-align:center;margin:28px 0;">
                    <a href="{$safeUrl}" style="background:#111;color:#fff;text-decoration:none;padding:12px 24px;border-radius:6px;display:inline-block;font-weight:bold;">
                        Track Your Order
                    </a>
                </p>
                <p style="color:#888;font-size:12px;">Or copy this link into your browser:<br>{$safeUrl}</p>
            </div>
            HTML;
    }

    /** What the buyer has to do to pay, for each method. */
    private static function paymentBlock(array $payment, string $orderNumber, string $currency, string $total, \Closure $e): string
    {
        $label = $e($payment['label'] ?? '');
        $box = static fn (string $body): string =>
            "<div style=\"background:#f6f7f9;border-radius:8px;padding:14px 16px;margin:16px 0;font-size:14px;line-height:1.5;\">"
            . "<p style=\"margin:0 0 6px;font-weight:bold;\">Payment: {$label}</p>{$body}</div>";

        switch ($payment['method']) {
            case 'cod':
                return $box("<p style=\"margin:0;\">Please have {$currency} {$total} ready when your order is delivered.</p>");

            case 'cheque':
                return $box("<p style=\"margin:0;\">Hand over a cheque for {$currency} {$total}, quoting order #{$orderNumber}. The order is marked paid when the cheque clears.</p>");

            case 'bank_transfer':
                $details = $payment['bank_transfer'] ?? ['accounts' => [], 'instructions' => ''];
                $accounts = '';
                $labels = ['bank_name' => 'Bank', 'account_holder' => 'Account name', 'account_number' => 'Account number', 'iban' => 'IBAN', 'swift' => 'SWIFT', 'branch' => 'Branch'];
                foreach ($details['accounts'] ?? [] as $account) {
                    $lines = '';
                    foreach ($labels as $field => $fieldLabel) {
                        if (($account[$field] ?? '') !== '') {
                            $lines .= "<tr><td style=\"padding:2px 12px 2px 0;color:#666;\">{$fieldLabel}</td><td style=\"padding:2px 0;font-family:monospace;\">" . $e($account[$field]) . "</td></tr>";
                        }
                    }
                    $accounts .= "<table style=\"border-collapse:collapse;margin:8px 0;\">{$lines}</table>";
                }
                $instructions = trim((string)($details['instructions'] ?? ''));
                return $box(
                    "<p style=\"margin:0;\">Transfer {$currency} {$total} to:</p>{$accounts}"
                    . "<p style=\"margin:8px 0 0;\">Reference: <strong style=\"font-family:monospace;\">{$orderNumber}</strong></p>"
                    . ($instructions !== '' ? "<p style=\"margin:8px 0 0;color:#555;\">" . nl2br($e($instructions)) . "</p>" : '')
                    . "<p style=\"margin:8px 0 0;color:#555;\">You can upload the transfer receipt from the tracking link below. We send your order once the payment is verified.</p>"
                );

            default:
                return '';
        }
    }
}
