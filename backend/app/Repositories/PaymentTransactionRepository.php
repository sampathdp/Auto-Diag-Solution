<?php

declare(strict_types=1);

namespace App\Repositories;

class PaymentTransactionRepository extends BaseRepository
{
    public function __construct()
    {
        parent::__construct('payment_transactions');
    }
}
