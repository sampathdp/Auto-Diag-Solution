<?php

declare(strict_types=1);

namespace App\Services\B2B;

use App\Exceptions\DomainException;
use App\Services\SettingService;

/**
 * The single source of truth for which payment methods a buyer may use
 * (INTEGRATION_ARCHITECTURE.md §5). Checkout shows what methods() returns, and the
 * server checks again with assertAllowed() when the order is placed.
 *
 * Hard limits that settings cannot widen:
 * - Retail: cod and bank_transfer only.
 * - B2B: cod, bank_transfer, cheque and credit.
 * - online_card is always shown as "Coming soon" and always refused, because no gateway
 *   is integrated yet (see App\Services\Payments\PaymentGateway).
 * - credit is refused until dealer credit accounts and invoicing go live (Phase 5),
 *   because the credit limit cannot be enforced before then.
 * - mock is accepted only outside production, for the e2e suite. It is never listed.
 */
final class PaymentMethodPolicy
{
    public const CHANNEL_RETAIL = 'retail';
    public const CHANNEL_B2B = 'b2b';

    private const RETAIL_ALLOWED = ['cod', 'bank_transfer'];
    private const B2B_ALLOWED = ['cod', 'bank_transfer', 'cheque', 'credit'];

    /** Methods that cannot be used yet, whatever the settings say. */
    private const NOT_LIVE = [
        'credit' => 'Credit terms are not available yet.',
        'online_card' => 'Coming soon',
    ];

    private const LABELS = [
        'cod' => ['Cash on delivery', 'Pay in cash when your order arrives.'],
        'bank_transfer' => ['Bank transfer', 'Transfer to our bank account. Your order is processed once the payment is verified.'],
        'cheque' => ['Cheque', 'Pay by company cheque. The order is marked paid when the cheque clears.'],
        'credit' => ['Credit account', 'Buy now and pay within your agreed credit period.'],
        'online_card' => ['Card payment', 'Pay online by debit or credit card.'],
    ];

    /** Initial orders.payment_status for each method. */
    private const INITIAL_STATUS = [
        'cod' => 'pending',
        'bank_transfer' => 'pending_verification',
        'cheque' => 'pending',
        'credit' => 'pending',
        'mock' => 'paid',
    ];

    private SettingService $settings;

    public function __construct()
    {
        $this->settings = new SettingService();
    }

    /**
     * Tiles for the checkout page, in display order. Methods switched off in settings
     * are left out; methods that exist but can't be used yet come back with
     * available=false and a reason.
     *
     * @return array<int, array{code:string, label:string, description:string, available:bool, reason:?string}>
     */
    public function methods(string $channel): array
    {
        $enabled = $this->enabledFor($channel);
        $out = [];
        foreach (array_keys(self::LABELS) as $code) {
            if ($code === 'online_card') {
                // Shown to everyone as "Coming soon", whatever the settings say.
                $out[] = $this->tile($code, false, self::NOT_LIVE['online_card']);
                continue;
            }
            if (!in_array($code, $enabled, true)) {
                continue;
            }
            $reason = self::NOT_LIVE[$code] ?? null;
            if ($code === 'bank_transfer' && !$this->bankAccounts()) {
                $reason = 'Bank transfer is not set up yet.';
            }
            $out[] = $this->tile($code, $reason === null, $reason);
        }
        return $out;
    }

    /** Throws a 422 unless $method may be used on $channel right now. */
    public function assertAllowed(string $method, string $channel): void
    {
        if ($method === '') {
            throw new DomainException('Choose a payment method', 422);
        }
        if ($method === 'mock') {
            if (self::isProduction()) {
                throw new DomainException('This payment method is not available', 422);
            }
            return;
        }
        foreach ($this->methods($channel) as $tile) {
            if ($tile['code'] === $method) {
                if (!$tile['available']) {
                    throw new DomainException($tile['label'] . ' is not available: ' . $tile['reason'], 422);
                }
                return;
            }
        }
        throw new DomainException('This payment method is not available for your order', 422);
    }

    public static function initialStatus(string $method): string
    {
        return self::INITIAL_STATUS[$method] ?? 'pending';
    }

    public static function label(string $method): string
    {
        return self::LABELS[$method][0] ?? ($method === 'mock' ? 'Test payment' : ucfirst(str_replace('_', ' ', $method)));
    }

    /**
     * Company bank accounts from settings, with blank rows dropped. Shared by retail
     * and B2B; shown at checkout, on the order page and in the confirmation email.
     *
     * @return array<int, array<string, string>>
     */
    public function bankAccounts(): array
    {
        $rows = $this->settings->get('payment_bank_accounts', []);
        if (!is_array($rows)) {
            return [];
        }
        $fields = ['bank_name', 'account_holder', 'account_number', 'iban', 'swift', 'branch'];
        $out = [];
        foreach ($rows as $row) {
            if (!is_array($row)) {
                continue;
            }
            $clean = [];
            foreach ($fields as $field) {
                $clean[$field] = trim((string)($row[$field] ?? ''));
            }
            if ($clean['iban'] !== '' || $clean['account_number'] !== '') {
                $out[] = $clean;
            }
        }
        return $out;
    }

    public function bankTransferInstructions(): string
    {
        return trim((string)$this->settings->get('payment_bank_transfer_instructions', ''));
    }

    /** What the buyer needs to pay by bank transfer: accounts, instructions, and the reference to quote. */
    public function bankTransferDetails(string $orderNumber): array
    {
        return [
            'accounts' => $this->bankAccounts(),
            'instructions' => $this->bankTransferInstructions(),
            'reference' => $orderNumber,
        ];
    }

    /** @return string[] */
    private function enabledFor(string $channel): array
    {
        if ($channel === self::CHANNEL_B2B) {
            $key = 'b2b_payment_methods';
            $cap = self::B2B_ALLOWED;
        } else {
            $key = 'retail_payment_methods';
            $cap = self::RETAIL_ALLOWED;
        }
        $configured = $this->settings->get($key, []);
        if (!is_array($configured)) {
            return [];
        }
        return array_values(array_intersect($cap, array_map('strval', $configured)));
    }

    private function tile(string $code, bool $available, ?string $reason): array
    {
        return [
            'code' => $code,
            'label' => self::LABELS[$code][0],
            'description' => self::LABELS[$code][1],
            'available' => $available,
            'reason' => $reason,
        ];
    }

    private static function isProduction(): bool
    {
        return ($_ENV['APP_ENV'] ?? 'local') === 'production';
    }
}
