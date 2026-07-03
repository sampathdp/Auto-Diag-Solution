<?php

declare(strict_types=1);

namespace App\Controllers;

use App\Core\Request;
use App\Repositories\SalonRepository;
use App\Core\Database\DatabaseManager;

class PublicSalonController extends BaseController
{
    private SalonRepository $salonRepo;

    public function __construct()
    {
        $this->salonRepo = new SalonRepository();
    }

    public function show(Request $request): void
    {
        $slug = $request->getParam('slug');
        if (!$slug) {
            $this->error("Slug is required", 400);
            return;
        }

        $salon = $this->salonRepo->findBySlug($slug);
        if (!$salon) {
            $this->error("Salon not found", 404);
            return;
        }

        if (!$salon['is_active']) {
            $this->error("Salon is currently unavailable", 403);
            return;
        }

        // Fetch Services
        $sql = "SELECT s.*, c.name as category_name 
                FROM services s 
                LEFT JOIN service_categories c ON s.category_id = c.id 
                WHERE s.salon_id = :salon_id AND s.is_active = 1";
        $services = DatabaseManager::query($sql, ['salon_id' => $salon['id']])->fetchAll();

        // Fetch Payment Methods
        $sql = "SELECT * FROM salon_payment_methods WHERE salon_id = :salon_id AND is_enabled = 1";
        $paymentMethods = DatabaseManager::query($sql, ['salon_id' => $salon['id']])->fetchAll();

        // Normalise qr_image to an absolute URL so the frontend doesn't need
        // to know the backend host (avoids localhost:8000 on production).
        $appUrl = rtrim($_ENV['APP_URL'] ?? '', '/');
        foreach ($paymentMethods as &$pm) {
            if (!empty($pm['qr_image']) && strpos($pm['qr_image'], 'http') !== 0) {
                $pm['qr_image'] = $appUrl . '/' . ltrim($pm['qr_image'], '/');
            }
        }
        unset($pm);

        // Fetch Staff
        $sql = "SELECT s.id, u.name 
                FROM staff s 
                JOIN users u ON s.user_id = u.id 
                WHERE s.salon_id = :salon_id AND u.is_active = 1";
        $staff = DatabaseManager::query($sql, ['salon_id' => $salon['id']])->fetchAll();

        // Fetch Branches
        $sql = "SELECT id, name, phone, address FROM branches WHERE salon_id = :salon_id AND is_active = 1";
        $branches = DatabaseManager::query($sql, ['salon_id' => $salon['id']])->fetchAll();

        $this->success([
            'salon' => $salon,
            'services' => $services,
            'staff' => $staff,
            'branches' => $branches,
            'payment_methods' => $paymentMethods,
            'require_payment_upfront' => (bool)($salon['require_payment_upfront'] ?? false),
            'upfront_type' => $salon['upfront_type'] ?? 'percentage',
            'upfront_amount' => $salon['upfront_amount'] ?? 0,
            'theme' => $salon['theme'] ?? 'modern'
        ]);
    }

    public function getAvailability(Request $request): void
    {
        $slug = $request->getParam('slug');
        $dateStr = $request->input('date'); // YYYY-MM-DD
        $duration = (int)$request->input('duration', 30);
        $staffId = $request->input('staff_id');

        if (!$slug || !$dateStr) {
            $this->error("Slug and date are required", 400);
            return;
        }

        $salon = $this->salonRepo->findBySlug($slug);
        if (!$salon) {
            $this->error("Salon not found", 404);
            return;
        }

        $date = new \DateTime($dateStr);
        $dayOfWeek = (int)$date->format('w'); // 0 (Sun) to 6 (Sat)

        // 1. Get Business Hours for this day
        $sql = "SELECT * FROM salon_business_hours WHERE salon_id = :salon_id AND day_of_week = :day AND is_open = 1 LIMIT 1";
        $hours = DatabaseManager::query($sql, [
            'salon_id' => $salon['id'],
            'day' => $dayOfWeek
        ])->fetch();

        if (!$hours) {
            $this->success([], "Salon is closed on this day.");
            return;
        }

        // 2. Get Busy Times (Appointments + Blocked Times)
        $sql = "SELECT start_time, end_time, staff_id FROM appointments 
                WHERE salon_id = :salon_id 
                AND appointment_date = :date 
                AND status NOT IN ('cancelled', 'no_show')";
        
        $params = ['salon_id' => $salon['id'], 'date' => $dateStr];
        $appointments = DatabaseManager::query($sql, $params)->fetchAll();

        $sqlBlocked = "SELECT start_time, end_time, staff_id FROM salon_blocked_times 
                       WHERE salon_id = :salon_id AND block_date = :date";
        $blockedTimes = DatabaseManager::query($sqlBlocked, ['salon_id' => $salon['id'], 'date' => $dateStr])->fetchAll();

        $allBusySlots = array_merge($appointments, $blockedTimes);

        // 3. Generate Slots
        $slots = [];
        $startTime = new \DateTime($dateStr . ' ' . $hours['open_time']);
        $endTime = new \DateTime($dateStr . ' ' . $hours['close_time']);
        $now = new \DateTime();

        // Increment by 30 mins
        while ($startTime < $endTime) {
            $slotStart = clone $startTime;
            $slotEnd = clone $startTime;
            $slotEnd->modify("+{$duration} minutes");

            // Check if slot exceeds closing time
            if ($slotEnd > $endTime) break;

            // Check for overlap
            $isOverlap = false;
            foreach ($allBusySlots as $busy) {
                // If this busy slot is for a specific staff member, only count as overlap if it matches current staff_id
                // If busy['staff_id'] is NULL, it means the whole salon is blocked!
                if (!empty($busy['staff_id']) && !empty($staffId) && $busy['staff_id'] != $staffId) {
                    continue;
                }
                
                $busyStart = new \DateTime($dateStr . ' ' . $busy['start_time']);
                $busyEnd = new \DateTime($dateStr . ' ' . $busy['end_time']);

                if ($slotStart < $busyEnd && $slotEnd > $busyStart) {
                    $isOverlap = true;
                    break;
                }
            }

            $slots[] = [
                'time' => $slotStart->format('H:i:s'),
                'label' => $slotStart->format('h:i A'),
                'is_available' => !$isOverlap && ($slotStart > $now)
            ];

            $startTime->modify('+30 minutes');
        }

        $this->success($slots);
    }

    public function lookupCustomer(Request $request): void
    {
        $slug = $request->getParam('slug');
        $phone = $request->input('phone');

        if (!$slug || !$phone) {
            $this->error("Slug and phone are required", 400);
            return;
        }

        $salon = $this->salonRepo->findBySlug($slug);
        if (!$salon) {
            $this->error("Salon not found", 404);
            return;
        }

        try {
            // Strip common characters from input phone to match DB
            $cleanPhone = preg_replace('/[^0-9]/', '', $phone);

            if (empty($cleanPhone)) {
                $this->error("Valid phone number required", 400);
                return;
            }

            $sql = "SELECT name, email FROM customers WHERE salon_id = :salon_id AND (REPLACE(REPLACE(REPLACE(phone, ' ', ''), '-', ''), '+', '') LIKE :phone) LIMIT 1";
            $customer = DatabaseManager::query($sql, [
                'salon_id' => $salon['id'],
                'phone' => '%' . $cleanPhone . '%'
            ])->fetch();

            if ($customer) {
                // Split name into first and last if possible
                $nameParts = explode(' ', $customer['name'], 2);
                $customer['first_name'] = $nameParts[0] ?? '';
                $customer['last_name'] = $nameParts[1] ?? '';
                $this->success($customer);
            } else {
                $this->error("Customer not found", 404);
            }
        } catch (\Exception $e) {
            $this->error($e->getMessage(), 500);
        }
    }

    public function book(Request $request): void
    {
        $slug = $request->getParam('slug');
        $data = $request->all();

        $salon = $this->salonRepo->findBySlug($slug);
        if (!$salon) {
            $this->error("Salon not found", 404);
            return;
        }

        // Logic for booking:
        // 1. Check if customer exists by phone/email for this salon
        // 2. Create customer if not
        // 3. Create appointment
        
        try {
            DatabaseManager::beginTransaction();

            $salonId = $salon['id'];

            // 1. Handle Customer
            $sql = "SELECT id FROM customers WHERE salon_id = :salon_id AND (email = :email OR phone = :phone) LIMIT 1";
            $customer = DatabaseManager::query($sql, [
                'salon_id' => $salonId,
                'email' => $data['email'],
                'phone' => $data['phone']
            ])->fetch();

            if ($customer) {
                $customerId = $customer['id'];
            } else {
                $sql = "INSERT INTO customers (salon_id, name, email, phone) 
                        VALUES (:salon_id, :name, :email, :phone)";
                DatabaseManager::query($sql, [
                    'salon_id' => $salonId,
                    'name' => trim(($data['first_name'] ?? '') . ' ' . ($data['last_name'] ?? '')),
                    'email' => $data['email'],
                    'phone' => $data['phone']
                ]);
                $customerId = DatabaseManager::getLastInsertId();
            }

            // 2. Handle Multiple Services
            $serviceIds = $data['service_ids'] ?? []; // Array of IDs
            if (empty($serviceIds) && !empty($data['service_id'])) {
                $serviceIds = [$data['service_id']];
            }

            $totalDuration = 0;
            $totalAmount = 0;
            $serviceDetails = [];

            if (!empty($serviceIds)) {
                $placeholders = implode(',', array_fill(0, count($serviceIds), '?'));
                $sql = "SELECT id, price, duration_minutes, name FROM services WHERE id IN ($placeholders)";
                $serviceDetails = DatabaseManager::query($sql, $serviceIds)->fetchAll();
                
                foreach ($serviceDetails as $service) {
                    $totalDuration += (int)$service['duration_minutes'];
                    $totalAmount += (float)$service['price'];
                }
            }

            if ($totalDuration === 0) $totalDuration = 30; // Default

            $startTime = new \DateTime($data['start_time']);
            $endTime = clone $startTime;
            $endTime->modify("+{$totalDuration} minutes");

            // 3. Create Appointment
            $paymentMethod = $data['method'] ?? 'cash';
            $paymentStatus = ($paymentMethod === 'cash') ? 'unpaid' : 'pending_verification';

             $assignedStaffId = !empty($data['staff_id']) ? $data['staff_id'] : null;
            
            // Auto-assign if not selected and only one staff exists
            if (!$assignedStaffId) {
                $sql = "SELECT id FROM staff WHERE salon_id = :salon_id";
                $allStaff = DatabaseManager::query($sql, ['salon_id' => $salonId])->fetchAll();
                if (count($allStaff) === 1) {
                    $assignedStaffId = $allStaff[0]['id'];
                }
            }

            $branchId = !empty($data['branch_id']) ? (int)$data['branch_id'] : null;

            $sql = "INSERT INTO appointments (salon_id, branch_id, customer_id, staff_id, appointment_date, start_time, end_time, status, total_amount, notes, payment_method, payment_status) 
                    VALUES (:salon_id, :branch_id, :customer_id, :staff_id, :appointment_date, :start_time, :end_time, 'pending', :total_amount, :notes, :payment_method, :payment_status)";
            DatabaseManager::query($sql, [
                'salon_id' => $salonId,
                'branch_id' => $branchId,
                'customer_id' => $customerId,
                'staff_id' => $assignedStaffId,
                'appointment_date' => $startTime->format('Y-m-d'),
                'start_time' => $startTime->format('H:i:s'),
                'end_time' => $endTime->format('H:i:s'),
                'total_amount' => $totalAmount,
                'notes' => $data['notes'] ?? 'Public Booking',
                'payment_method' => $paymentMethod,
                'payment_status' => $paymentStatus
            ]);
            $appointmentId = DatabaseManager::getLastInsertId();
            
            // 3.5 Link Multiple Services
            foreach ($serviceDetails as $service) {
                $sql = "INSERT INTO appointment_services (appointment_id, service_id, price, duration_minutes) 
                        VALUES (:appointment_id, :service_id, :price, :duration)";
                DatabaseManager::query($sql, [
                    'appointment_id' => $appointmentId,
                    'service_id' => $service['id'],
                    'price' => $service['price'],
                    'duration' => $service['duration_minutes']
                ]);
            }

            // 4. Handle Payment Proof
            if ($paymentMethod !== 'cash' && isset($_FILES['proof_image'])) {
                $proofImage = \App\Core\FileUploader::upload($_FILES['proof_image'], "salon_{$salonId}/proofs");
                
                $sql = "INSERT INTO payment_proofs (salon_id, appointment_id, proof_image, amount, status) 
                        VALUES (:salon_id, :appointment_id, :proof_image, :amount, 'pending')";
                DatabaseManager::query($sql, [
                    'salon_id' => $salonId,
                    'appointment_id' => $appointmentId,
                    'proof_image' => $proofImage,
                    'amount' => $data['amount'] ?? 0
                ]);
            }

            DatabaseManager::commit();

            try {
                $this->sendPublicBookingSms((int)$salonId, (int)$customerId, $serviceDetails, $startTime->format('Y-m-d'), $startTime->format('H:i:s'));
            } catch (\Exception $ex) {
                // Ignore SMS dispatch failures
            }

            try {
                $this->sendPublicBookingEmail((int)$salonId, (int)$customerId, $serviceDetails, $startTime->format('Y-m-d'), $startTime->format('H:i:s'));
            } catch (\Exception $ex) {
                // Ignore Email dispatch failures, but log the failure details
                $logDir = __DIR__ . '/../../scratch';
                if (!is_dir($logDir)) {
                    mkdir($logDir, 0777, true);
                }
                $logFile = $logDir . '/emails.log';
                $msg = sprintf("[%s] [Public Booking] [Salon ID: %d] Exception during public booking email send: %s\n", date('Y-m-d H:i:s'), $salonId, $ex->getMessage());
                file_put_contents($logFile, $msg, FILE_APPEND);
            }

            $this->success(null, "Appointment booked successfully!");
        } catch (\Exception $e) {
            DatabaseManager::rollBack();
            $this->error($e->getMessage());
        }
    }

    private function sendPublicBookingSms(int $salonId, int $customerId, array $serviceDetails, string $date, string $time): void
    {
        $settingsRepo = new \App\Repositories\SettingsRepository();
        $settings = $settingsRepo->getAllKeyValueForSalon($salonId);

        if (($settings['sms_enabled'] ?? '0') !== '1' || ($settings['sms_on_booking'] ?? '0') !== '1') {
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

        $serviceNames = [];
        foreach ($serviceDetails as $service) {
            $serviceNames[] = $service['name'];
        }
        $servicesStr = implode(', ', $serviceNames);

        $timeStr = date("g:i A", strtotime($time));
        $msg = "Dear " . $customer['name'] . ", your booking for " . ($servicesStr ? $servicesStr . " " : "") . "at " . $salonName . " is confirmed on " . $date . " at " . $timeStr . ". Thank you!";

        $smsService = new \App\Services\SmsService();
        $smsService->sendSmsForSalon($salonId, $customer['phone'], $msg);
    }

    private function sendPublicBookingEmail(int $salonId, int $customerId, array $serviceDetails, string $date, string $time): void
    {
        $settingsRepo = new \App\Repositories\SettingsRepository();
        $settings = $settingsRepo->getAllKeyValueForSalon($salonId);

        $logDir = __DIR__ . '/../../scratch';
        if (!is_dir($logDir)) {
            mkdir($logDir, 0777, true);
        }
        $logFile = $logDir . '/emails.log';

        if (($settings['email_enabled'] ?? '0') !== '1') {
            $msg = sprintf("[%s] [Public Booking] [Salon ID: %d] Skip email: email_enabled is disabled in settings.\n", date('Y-m-d H:i:s'), $salonId);
            file_put_contents($logFile, $msg, FILE_APPEND);
            return;
        }

        if (($settings['email_on_booking'] ?? '0') !== '1') {
            $msg = sprintf("[%s] [Public Booking] [Salon ID: %d] Skip email: email_on_booking is disabled in settings.\n", date('Y-m-d H:i:s'), $salonId);
            file_put_contents($logFile, $msg, FILE_APPEND);
            return;
        }

        $customer = DatabaseManager::query(
            "SELECT name, email FROM customers WHERE id = :id AND salon_id = :salon_id LIMIT 1",
            ['id' => $customerId, 'salon_id' => $salonId]
        )->fetch();

        if (!$customer) {
            $msg = sprintf("[%s] [Public Booking] [Salon ID: %d] Skip email: Customer ID %d not found.\n", date('Y-m-d H:i:s'), $salonId, $customerId);
            file_put_contents($logFile, $msg, FILE_APPEND);
            return;
        }

        if (empty($customer['email'])) {
            $msg = sprintf("[%s] [Public Booking] [Salon ID: %d] Skip email: Customer '%s' (ID %d) has no email address.\n", date('Y-m-d H:i:s'), $salonId, $customer['name'], $customerId);
            file_put_contents($logFile, $msg, FILE_APPEND);
            return;
        }

        $salon = DatabaseManager::query(
            "SELECT name FROM salons WHERE id = :id LIMIT 1",
            ['id' => $salonId]
        )->fetch();
        $salonName = $salon['name'] ?? 'Our Salon';

        $totalDuration = 0;
        $serviceNames = [];
        foreach ($serviceDetails as $service) {
            $serviceNames[] = $service['name'];
            $totalDuration += (int)($service['duration_minutes'] ?? 30);
        }
        if ($totalDuration <= 0) {
            $totalDuration = 30;
        }
        $servicesStr = implode(', ', $serviceNames);

        $timeStr = date("g:i A", strtotime($time));

        $emailService = new \App\Services\EmailService();

        $subject = $settings['email_booking_subject'] ?? '';
        if (empty($subject)) {
            $subject = 'Appointment Request Received (Pending Confirmation)';
        }

        $template = $settings['email_booking_template'] ?? '';
        if (empty($template)) {
            $template = "Hello {customer_name},\n\nThank you for choosing {salon_name}!\n\nWe have received your appointment request. Please note that it is currently waiting for confirmation from our side. Once we approve your request, you will receive another email with the final confirmation and appointment details.\n\nDetails:\nDate: {appointment_date}\nTime: {appointment_time}\nService: {service_name}\n\nBest regards,\n{salon_name}";
        }

        $placeholders = [
            'customer_name' => $customer['name'],
            'salon_name' => $salonName,
            'appointment_date' => $date,
            'appointment_time' => $timeStr,
            'service_name' => $servicesStr
        ];

        $subject = $emailService->formatTemplate($subject, $placeholders);
        $body = $emailService->formatTemplate($template, $placeholders);

        $emailService->sendEmailForSalon($salonId, $customer['email'], $subject, $body, null);
    }
}
