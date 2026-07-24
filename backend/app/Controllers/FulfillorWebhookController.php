<?php

declare(strict_types=1);

namespace App\Controllers;

use App\Core\Request;
use App\Exceptions\DomainException;
use App\Services\Fulfillment\FulfillmentService;

/**
 * Receives order status push updates from Fulfillor, if/once they support outbound
 * webhooks — Fulfillor_API_v1_Reference.pdf documents a plain pull-only REST API
 * (List/Get/Create/Update orders) with no callback/webhook endpoint, so this route is
 * a defensive extra for if that changes later, not a documented Fulfillor capability.
 * The real, confirmed sync mechanism is polling (see FulfillmentService::
 * syncAllPending(), scheduled via console.php's fulfillor:sync). Payload field names
 * and the secret header below are placeholders pending real webhook docs, if Fulfillor
 * ever provides them — adjust once confirmed. Necessarily unauthenticated (the caller
 * would be Fulfillor's server, not a logged-in browser) so it's gated by a shared
 * secret instead of a JWT.
 */
class FulfillorWebhookController extends BaseController
{
    private FulfillmentService $fulfillment;

    public function __construct()
    {
        $this->fulfillment = new FulfillmentService();
    }

    public function handle(Request $request): void
    {
        $secret = trim((string)($_ENV['FULFILLOR_WEBHOOK_SECRET'] ?? ''));
        $provided = (string)($request->getHeader('X-Fulfillor-Secret') ?? '');

        if ($secret === '' || !hash_equals($secret, $provided)) {
            throw new DomainException('Unauthorized', 401);
        }

        $externalId = trim((string)($request->input('externalId') ?? $request->input('externalOrderId') ?? ''));
        if ($externalId === '') {
            throw new DomainException('externalId is required', 422);
        }

        $this->fulfillment->applyWebhookUpdate($externalId, $request->all());

        $this->success(null, 'Received');
    }
}
