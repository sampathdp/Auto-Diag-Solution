<?php

declare(strict_types=1);

namespace App\Services\Payments;

/**
 * Seam for the online card gateway, which is on hold until the client picks a provider
 * (INTEGRATION_ARCHITECTURE.md §5). Nothing implements this yet, and
 * PaymentMethodPolicy refuses 'online_card' at checkout.
 *
 * An adapter must:
 * - start a payment for an order already saved with payment_status 'pending';
 * - on the callback, verify the provider's signature, load the order by its reference
 *   on the server (never trust an order id or amount from the callback alone), compare
 *   amount and currency, then insert a payment_transactions row. The
 *   UNIQUE(provider, provider_reference) key turns a replayed callback into a no-op.
 */
interface PaymentGateway
{
    /** Provider code stored in payment_transactions.provider. */
    public function provider(): string;

    /**
     * Starts a payment and returns where to send the buyer.
     *
     * @return array{redirect_url:string, provider_reference:string}
     */
    public function startPayment(array $order, string $returnUrl): array;

    /**
     * Verifies a callback and returns its outcome. Must throw if the signature is invalid.
     *
     * @return array{order_number:string, provider_reference:string, amount:float, currency:string, succeeded:bool, raw:array}
     */
    public function verifyCallback(array $headers, string $body): array;
}
