<?php

declare(strict_types=1);

namespace App\Controllers;

use App\Core\Request;
use App\Core\Database\DatabaseManager;
use Exception;

class BillingController extends BaseController
{
    /**
     * Create a manual invoice (Retail Sale)
     */
    public function store(Request $request): void
    {
        $data = $request->all();
        $salonId = \App\Core\Auth\TenantContext::getTenantId();
        $customerId = (int)$data['customer_id'];
        $branchId = \App\Core\Auth\TenantContext::getBranchId() !== null 
            ? \App\Core\Auth\TenantContext::getBranchId() 
            : (!empty($data['branch_id']) ? (int)$data['branch_id'] : null);
        $items = $data['items'] ?? []; // Array of {product_id, service_id, quantity, price}
        $subtotal = 0;

        DatabaseManager::beginTransaction();

        try {
            $invNumber = 'INV-' . strtoupper(uniqid());
            
            // 1. Create Invoice
            DatabaseManager::query(
                "INSERT INTO invoices (salon_id, branch_id, customer_id, invoice_number, payment_status) 
                 VALUES (:salon_id, :branch_id, :customer_id, :invoice_number, 'pending')",
                [
                    'salon_id' => $salonId,
                    'branch_id' => $branchId,
                    'customer_id' => $customerId,
                    'invoice_number' => $invNumber
                ]
            );
            $invoiceId = (int)DatabaseManager::getLastInsertId();

            // 2. Add Items
            foreach ($items as $item) {
                $qty = (int)($item['quantity'] ?? 1);
                $price = (float)$item['price'];
                $total = $qty * $price;
                $subtotal += $total;

                DatabaseManager::query(
                    "INSERT INTO invoice_items (invoice_id, service_id, product_id, item_name, quantity, unit_price, total_price) 
                     VALUES (:inv_id, :srv_id, :prd_id, :name, :qty, :u_price, :t_price)",
                    [
                        'inv_id' => $invoiceId,
                        'srv_id' => $item['service_id'] ?? null,
                        'prd_id' => $item['product_id'] ?? null,
                        'name' => $item['name'],
                        'qty' => $qty,
                        'u_price' => $price,
                        't_price' => $total
                    ]
                );

                // 3. If Product, Reduce Stock & Record Inventory Transaction
                if (isset($item['product_id'])) {
                    $pid = (int)$item['product_id'];
                    
                    // Reduce Stock
                    DatabaseManager::query(
                        "UPDATE products SET stock_quantity = stock_quantity - :qty 
                         WHERE id = :id AND salon_id = :sid",
                        ['qty' => $qty, 'id' => $pid, 'sid' => $salonId]
                    );

                    // Record Transaction
                    DatabaseManager::query(
                        "INSERT INTO inventory_transactions (salon_id, product_id, type, quantity, notes) 
                         VALUES (:sid, :pid, 'sale', :qty, :notes)",
                        [
                            'sid' => $salonId,
                            'pid' => $pid,
                            'qty' => $qty,
                            'notes' => "Sold via $invNumber"
                        ]
                    );
                }
            }

            // 4. Update Invoice Totals & Status
            $paymentMethod = $data['payment_method'] ?? 'cash';
            $isPaid = isset($data['is_paid']) && $data['is_paid'] === true;
            $status = $isPaid ? 'paid' : 'pending';

            DatabaseManager::query(
                "UPDATE invoices SET subtotal = :sub, total = :tot, payment_status = :status WHERE id = :id",
                [
                    'sub' => $subtotal, 
                    'tot' => $subtotal, 
                    'status' => $status,
                    'id' => $invoiceId
                ]
            );

            // 5. If paid, record payment
            if ($isPaid) {
                $method = $paymentMethod;
                if ($method === 'online') $method = 'bank_transfer';

                DatabaseManager::query(
                    "INSERT INTO payments (salon_id, invoice_id, amount, payment_method, transaction_reference) 
                     VALUES (:sid, :inv_id, :amt, :method, 'Full payment for retail sale')",
                    [
                        'sid' => $salonId,
                        'inv_id' => $invoiceId,
                        'amt' => $subtotal,
                        'method' => $method
                    ]
                );
            }

            DatabaseManager::commit();

            if ($isPaid) {
                try {
                    $this->sendPaymentSms($customerId, $subtotal, $invNumber);
                } catch (\Exception $ex) {
                    // Ignore SMS failures
                }
            }

            $this->success(['id' => $invoiceId, 'invoice_number' => $invNumber], "Invoice created successfully");

        } catch (Exception $e) {
            DatabaseManager::rollBack();
            $this->error($e->getMessage());
        }
    }

    public function index(Request $request): void
    {
        $salonId = \App\Core\Auth\TenantContext::getTenantId();
        $branchId = \App\Core\Auth\TenantContext::getBranchId() !== null 
            ? \App\Core\Auth\TenantContext::getBranchId() 
            : ($request->input('branch_id') ? (int)$request->input('branch_id') : null);

        $sql = "SELECT i.*, c.name as customer_name, c.phone as customer_phone,
                       COALESCE((SELECT SUM(amount) FROM payments WHERE invoice_id = i.id), 0) as paid_amount
                FROM invoices i
                JOIN customers c ON i.customer_id = c.id
                WHERE i.salon_id = :salon_id";

        $params = ['salon_id' => $salonId];

        if ($branchId !== null) {
            $sql .= " AND (i.branch_id = :branch_id OR i.branch_id IS NULL)";
            $params['branch_id'] = $branchId;
        }

        $sql .= " ORDER BY i.created_at DESC";
        
        $invoices = DatabaseManager::query($sql, $params)->fetchAll();
        $this->success($invoices);
    }

    /**
     * Get specific invoice details
     */
    public function show(Request $request): void
    {
        $id = (int)$request->getParam('id');
        $salonId = \App\Core\Auth\TenantContext::getTenantId();

        $invoice = DatabaseManager::query(
            "SELECT i.*, c.name as customer_name, c.phone as customer_phone
             FROM invoices i
             JOIN customers c ON i.customer_id = c.id
             WHERE i.id = :id AND i.salon_id = :salon_id",
            ['id' => $id, 'salon_id' => $salonId]
        )->fetch();

        if (!$invoice) {
            $this->error("Invoice not found");
            return;
        }

        $payments = DatabaseManager::query(
            "SELECT * FROM payments WHERE invoice_id = :id ORDER BY paid_at DESC",
            ['id' => $id]
        )->fetchAll();

        $items = DatabaseManager::query(
            "SELECT * FROM invoice_items WHERE invoice_id = :id",
            ['id' => $id]
        )->fetchAll();

        $invoice['payments'] = $payments;
        $invoice['items'] = $items;
        $this->success($invoice);
    }

    /**
     * Get payment status for an appointment
     */
    public function status(Request $request): void
    {
        $appointmentId = (int)$request->getParam('id');
        $salonId = \App\Core\Auth\TenantContext::getTenantId();

        // 1. Get Appointment total
        $appointment = DatabaseManager::query(
            "SELECT total_amount FROM appointments WHERE id = :id AND salon_id = :salon_id",
            ['id' => $appointmentId, 'salon_id' => $salonId]
        )->fetch();

        if (!$appointment) {
            $this->error("Appointment not found");
            return;
        }

        // 2. Get Paid amount
        $sql = "SELECT COALESCE(SUM(p.amount), 0) as paid_amount 
                FROM payments p 
                JOIN invoices i ON p.invoice_id = i.id 
                WHERE i.appointment_id = :appointment_id AND i.salon_id = :salon_id";
        
        $paid = DatabaseManager::query($sql, [
            'appointment_id' => $appointmentId,
            'salon_id' => $salonId
        ])->fetch();

        $this->success([
            'total_amount' => (float)$appointment['total_amount'],
            'paid_amount' => (float)$paid['paid_amount'],
            'balance' => (float)$appointment['total_amount'] - (float)$paid['paid_amount']
        ]);
    }

    /**
     * Record a payment
     */
    public function pay(Request $request): void
    {
        $data = $request->all();
        $invoiceId = isset($data['invoice_id']) ? (int)$data['invoice_id'] : null;
        $appointmentId = isset($data['appointment_id']) ? (int)$data['appointment_id'] : null;
        $amount = (float)$data['amount'];
        $method = $data['method'] ?? 'cash';
        if ($method === 'online') $method = 'bank_transfer';
        $salonId = \App\Core\Auth\TenantContext::getTenantId();

        DatabaseManager::beginTransaction();

        try {
            // 1. Determine which invoice we are paying
            if (!$invoiceId && $appointmentId) {
                // Find invoice for this appointment
                $inv = DatabaseManager::query(
                    "SELECT id FROM invoices WHERE appointment_id = :aid AND salon_id = :sid",
                    ['aid' => $appointmentId, 'sid' => $salonId]
                )->fetch();
                if ($inv) $invoiceId = (int)$inv['id'];
            }

            // 2. Get current balance to prevent overpayment
            if ($invoiceId) {
                $sqlStatus = "SELECT i.total - COALESCE(SUM(p.amount), 0) as balance 
                              FROM invoices i 
                              LEFT JOIN payments p ON i.id = p.invoice_id 
                              WHERE i.id = :id AND i.salon_id = :sid 
                              GROUP BY i.id";
                $status = DatabaseManager::query($sqlStatus, ['id' => $invoiceId, 'sid' => $salonId])->fetch();
            } else if ($appointmentId) {
                $sqlStatus = "SELECT a.total_amount - COALESCE(SUM(p.amount), 0) as balance 
                              FROM appointments a 
                              LEFT JOIN invoices i ON a.id = i.appointment_id 
                              LEFT JOIN payments p ON i.id = p.invoice_id 
                              WHERE a.id = :id AND a.salon_id = :sid 
                              GROUP BY a.id";
                $status = DatabaseManager::query($sqlStatus, ['id' => $appointmentId, 'sid' => $salonId])->fetch();
            } else {
                throw new Exception("Invoice or Appointment ID is required");
            }
            
            $balance = (float)($status['balance'] ?? 0);

            if ($amount > ($balance + 0.01)) { // Small buffer for float precision
                throw new Exception("Payment amount (LKR " . number_format($amount) . ") exceeds the remaining balance (LKR " . number_format($balance) . ").");
            }

            // 3. Ensure invoice exists (Create if it's an appointment payment without an invoice)
            if (!$invoiceId && $appointmentId) {
                // Create basic invoice
                $apt = DatabaseManager::query("SELECT * FROM appointments WHERE id = :id", ['id' => $appointmentId])->fetch();
                $invNumber = 'INV-' . strtoupper(uniqid());
                $branchId = $apt['branch_id'] ?? null;
                
                $sql = "INSERT INTO invoices (salon_id, branch_id, appointment_id, customer_id, invoice_number, subtotal, total, payment_status) 
                        VALUES (:salon_id, :branch_id, :appointment_id, :customer_id, :invoice_number, :subtotal, :total, 'pending')";
                
                DatabaseManager::query($sql, [
                    'salon_id' => $salonId,
                    'branch_id' => $branchId,
                    'appointment_id' => $appointmentId,
                    'customer_id' => $apt['customer_id'],
                    'invoice_number' => $invNumber,
                    'subtotal' => $apt['total_amount'],
                    'total' => $apt['total_amount']
                ]);
                
                $invoiceId = (int)DatabaseManager::getLastInsertId();

                // Add Appointment Services into Invoice Items
                $services = DatabaseManager::query(
                    "SELECT s.* FROM services s 
                     JOIN appointment_services aps ON s.id = aps.service_id 
                     WHERE aps.appointment_id = :aid",
                    ['aid' => $appointmentId]
                )->fetchAll();

                foreach ($services as $service) {
                    DatabaseManager::query(
                        "INSERT INTO invoice_items (invoice_id, service_id, item_name, quantity, unit_price, total_price) 
                         VALUES (:inv_id, :srv_id, :name, 1, :price, :price)",
                        [
                            'inv_id' => $invoiceId,
                            'srv_id' => $service['id'],
                            'name' => $service['name'],
                            'price' => $service['price']
                        ]
                    );
                }
            }

            // 2. Record Payment
            $sql = "INSERT INTO payments (salon_id, invoice_id, payment_method, amount, paid_at) 
                    VALUES (:salon_id, :invoice_id, :payment_method, :amount, NOW())";
            
            DatabaseManager::query($sql, [
                'salon_id' => $salonId,
                'invoice_id' => $invoiceId,
                'payment_method' => $method,
                'amount' => $amount
            ]);

            // 3. Update Invoice Status
            $paidTotal = (float)DatabaseManager::query(
                "SELECT SUM(amount) FROM payments WHERE invoice_id = :id",
                ['id' => $invoiceId]
            )->fetchColumn();

            $invTotal = (float)DatabaseManager::query(
                "SELECT total FROM invoices WHERE id = :id",
                ['id' => $invoiceId]
            )->fetchColumn();

            $status = 'partial';
            if ($paidTotal >= $invTotal) {
                $status = 'paid';
            } elseif ($paidTotal <= 0) {
                $status = 'pending';
            }

             DatabaseManager::query(
                 "UPDATE invoices SET payment_status = :status WHERE id = :id",
                 ['status' => $status, 'id' => $invoiceId]
             );

             if ($status === 'paid') {
                 $invoice = DatabaseManager::query("SELECT appointment_id FROM invoices WHERE id = :id", ['id' => $invoiceId])->fetch();
                 if ($invoice && !empty($invoice['appointment_id'])) {
                     DatabaseManager::query(
                         "UPDATE appointments SET status = 'completed' WHERE id = :aid",
                         ['aid' => $invoice['appointment_id']]
                     );
                 }
             }

             DatabaseManager::commit();

             try {
                 $invoice = DatabaseManager::query(
                     "SELECT customer_id, invoice_number FROM invoices WHERE id = :id",
                     ['id' => $invoiceId]
                 )->fetch();
                 if ($invoice) {
                     $this->sendPaymentSms((int)$invoice['customer_id'], $amount, $invoice['invoice_number']);
                 }
             } catch (\Exception $ex) {
                 // Ignore SMS failures
             }

             $this->success(null, "Payment recorded successfully");

        } catch (Exception $e) {
            DatabaseManager::rollBack();
            $this->error($e->getMessage());
        }
    }

    private function sendPaymentSms(int $customerId, float $amount, string $invoiceNumber): void
    {
        $salonId = \App\Core\Auth\TenantContext::getTenantId();
        if (!$salonId) return;

        $settingsRepo = new \App\Repositories\SettingsRepository();
        $settings = $settingsRepo->getAllKeyValue();

        if (($settings['sms_enabled'] ?? '0') !== '1' || ($settings['sms_on_payment'] ?? '0') !== '1') {
            return;
        }

        $customer = DatabaseManager::query(
            "SELECT name, phone FROM customers WHERE id = :id AND salon_id = :salon_id LIMIT 1",
            ['id' => $customerId, 'salon_id' => $salonId]
        )->fetch();

        if (!$customer || empty($customer['phone'])) {
            return;
        }

        $salon = DatabaseManager::query(
            "SELECT name FROM salons WHERE id = :id LIMIT 1",
            ['id' => $salonId]
        )->fetch();
        $salonName = $salon['name'] ?? 'Our Salon';

        $msg = "Dear " . $customer['name'] . ", we received your payment of LKR " . number_format($amount, 2) . " for Invoice " . $invoiceNumber . " at " . $salonName . ". Thank you!";

        $smsService = new \App\Services\SmsService();
        $smsService->sendSms($customer['phone'], $msg);
    }
}
