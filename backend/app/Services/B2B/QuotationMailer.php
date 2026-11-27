<?php

declare(strict_types=1);

namespace App\Services\B2B;

/**
 * Quotation emails (email only). Queued through EmailOutbox after the change has
 * committed, with the same layout as the other dealer emails. Dealers get a link to the
 * quotation in their account; the sales team (b2b_sales_team_emails) gets a link to the
 * admin page. Internal messages are never emailed to the dealer.
 */
final class QuotationMailer extends DealerMailer
{
    public function submitted(array $q, array $items, array $profile, array $user): void
    {
        $number = $this->e($q['quotation_number']);
        $total = $this->money($q['total']);
        $this->send(
            (string)$user['email'],
            "We received your quotation request {$q['quotation_number']}",
            'quotation_submitted',
            "<p>Hi {$this->e($user['name'])},</p>
             <p>Thank you. We have received quotation request <strong>{$number}</strong> for {$this->itemCount($items)} ({$total} at your dealer prices).</p>
             <p>Our sales team checks the prices, stock and delivery with you before anything is charged. We usually reply within 1 working day. Nothing is taken from stock and no payment is due yet.</p>
             <p>Follow it here: {$this->link('/account/quotations/' . (int)$q['id'])}</p>"
        );

        $admin = $this->adminLink('/admin/b2b/quotations/' . (int)$q['id']);
        $rows = '';
        foreach ($items as $item) {
            $rows .= '<tr><td>' . $this->e($item['sku']) . '</td><td>' . $this->e($item['name_en']) . '</td><td align="right">'
                . (int)$item['quantity'] . '</td><td align="right">' . $this->money($item['unit_price']) . '</td></tr>';
        }
        foreach ($this->teamRecipients() as $to) {
            $this->send(
                $to,
                "New quotation request {$q['quotation_number']} from " . ($profile['business_name'] ?? 'a dealer'),
                'quotation_submitted_team',
                "<p><strong>{$this->e($profile['business_name'] ?? '')}</strong> ({$this->e($profile['dealer_code'] ?? '')}) sent quotation request <strong>{$number}</strong>"
                . ((int)$q['is_first_order'] === 1 ? ' for their first order' : '') . ".</p>
                 <table cellpadding=\"4\" style=\"border-collapse:collapse\">
                   <tr><th align=\"left\">SKU</th><th align=\"left\">Item</th><th align=\"right\">Qty</th><th align=\"right\">Dealer price</th></tr>
                   {$rows}
                 </table>
                 <p><strong>Total:</strong> {$total} · <strong>Preferred payment:</strong> {$this->e(PaymentMethodPolicy::label((string)$q['payment_method_pref']))}</p>
                 <p>Review it here: {$admin}</p>"
            );
        }
    }

    public function revised(array $q, array $profile, array $user, ?string $message): void
    {
        $note = $message !== null && $message !== ''
            ? '<blockquote style="border-left:3px solid #ccc;padding-left:12px;margin-left:0">' . nl2br($this->e($message)) . '</blockquote>'
            : '';
        $this->send(
            (string)$user['email'],
            "Quotation {$q['quotation_number']} has been updated",
            'quotation_revised',
            "<p>Hi {$this->e($user['name'])},</p>
             <p>We have updated quotation <strong>{$this->e($q['quotation_number'])}</strong> (version " . (int)$q['current_version'] . "). The new total is <strong>{$this->money($q['total'])}</strong>.</p>
             {$note}
             <p>Our team will confirm the final quotation with you. See the changes here: {$this->link('/account/quotations/' . (int)$q['id'])}</p>"
        );
    }

    public function approvedQuote(array $q, array $user): void
    {
        $expires = !empty($q['expires_at']) ? date('j M Y', strtotime((string)$q['expires_at'])) : null;
        $this->send(
            (string)$user['email'],
            "Your quotation {$q['quotation_number']} is ready to accept",
            'quotation_approved',
            "<p>Hi {$this->e($user['name'])},</p>
             <p>Quotation <strong>{$this->e($q['quotation_number'])}</strong> is confirmed at <strong>{$this->money($q['total'])}</strong>.</p>
             <p>Accept it to place the order" . ($expires ? " before <strong>{$this->e($expires)}</strong>, when the offer expires" : '') . ". Stock is reserved only once you accept.</p>
             <p>Review and accept: {$this->link('/account/quotations/' . (int)$q['id'])}</p>"
        );
    }

    public function rejectedByAdmin(array $q, array $profile, array $user, string $reason): void
    {
        $this->send(
            (string)$user['email'],
            "Update on your quotation {$q['quotation_number']}",
            'quotation_rejected',
            "<p>Hi {$this->e($user['name'])},</p>
             <p>We're unable to offer quotation <strong>{$this->e($q['quotation_number'])}</strong>.</p>
             <p><strong>Reason:</strong><br>" . nl2br($this->e($reason)) . "</p>
             <p>You're welcome to send a new request from your cart, or reply to this email.</p>"
        );
    }

    public function messageToDealer(array $q, array $profile, array $user, string $body, bool $replyNeeded): void
    {
        $this->send(
            (string)$user['email'],
            ($replyNeeded ? 'Please reply: ' : 'New message on ') . "quotation {$q['quotation_number']}",
            'quotation_message',
            "<p>Hi {$this->e($user['name'])},</p>
             <p>Our sales team wrote about quotation <strong>{$this->e($q['quotation_number'])}</strong>:</p>
             <blockquote style=\"border-left:3px solid #ccc;padding-left:12px;margin-left:0\">" . nl2br($this->e($body)) . "</blockquote>
             <p>" . ($replyNeeded ? 'We need your reply before we can continue. ' : '') . "Reply here: {$this->link('/account/quotations/' . (int)$q['id'])}</p>"
        );
    }

    public function dealerReplied(array $q, array $profile, string $body): void
    {
        foreach ($this->teamRecipients() as $to) {
            $this->send(
                $to,
                "Dealer reply on quotation {$q['quotation_number']}",
                'quotation_dealer_message',
                "<p><strong>{$this->e($profile['business_name'] ?? '')}</strong> ({$this->e($profile['dealer_code'] ?? '')}) wrote on quotation <strong>{$this->e($q['quotation_number'])}</strong>:</p>
                 <blockquote style=\"border-left:3px solid #ccc;padding-left:12px;margin-left:0\">" . nl2br($this->e($body)) . "</blockquote>
                 <p>{$this->adminLink('/admin/b2b/quotations/' . (int)$q['id'])}</p>"
            );
        }
    }

    public function dealerDeclined(array $q, array $profile, ?string $reason, bool $withdrawn): void
    {
        $reasonHtml = $reason ? '<p><strong>Reason:</strong><br>' . nl2br($this->e($reason)) . '</p>' : '';
        foreach ($this->teamRecipients() as $to) {
            $this->send(
                $to,
                "Quotation {$q['quotation_number']} " . ($withdrawn ? 'withdrawn' : 'declined') . ' by the dealer',
                'quotation_declined',
                "<p><strong>{$this->e($profile['business_name'] ?? '')}</strong> ({$this->e($profile['dealer_code'] ?? '')}) "
                . ($withdrawn ? 'withdrew' : 'declined') . " quotation <strong>{$this->e($q['quotation_number'])}</strong>.</p>
                 {$reasonHtml}
                 <p>{$this->adminLink('/admin/b2b/quotations/' . (int)$q['id'])}</p>"
            );
        }
    }

    public function expiring(array $q, array $user): void
    {
        $expires = date('j M Y, H:i', strtotime((string)$q['expires_at']));
        $this->send(
            (string)$user['email'],
            "Quotation {$q['quotation_number']} expires soon",
            'quotation_expiring',
            "<p>Hi {$this->e($user['name'])},</p>
             <p>Quotation <strong>{$this->e($q['quotation_number'])}</strong> ({$this->money($q['total'])}) expires on <strong>{$this->e($expires)}</strong>. Accept it before then to place the order at the quoted prices.</p>
             <p>{$this->link('/account/quotations/' . (int)$q['id'])}</p>"
        );
    }

    public function converted(array $q, array $profile, string $orderNumber, int $orderId): void
    {
        foreach ($this->teamRecipients() as $to) {
            $this->send(
                $to,
                "Quotation {$q['quotation_number']} accepted: order {$orderNumber}",
                'quotation_converted',
                "<p><strong>{$this->e($profile['business_name'] ?? '')}</strong> ({$this->e($profile['dealer_code'] ?? '')}) accepted quotation <strong>{$this->e($q['quotation_number'])}</strong>.</p>
                 <p>It is now order <strong>{$this->e($orderNumber)}</strong> ({$this->money($q['total'])}, " . $this->e(PaymentMethodPolicy::label((string)$q['payment_method_pref'])) . "), waiting for VIN verification.</p>
                 <p>{$this->adminLink('/admin/orders/' . $orderId)}</p>"
            );
        }
    }

    private function money(mixed $amount): string
    {
        return 'AED ' . number_format((float)$amount, 2);
    }

    private function itemCount(array $items): string
    {
        $n = count($items);
        return $n === 1 ? '1 item' : "{$n} items";
    }
}
