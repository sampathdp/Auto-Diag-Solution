<?php

declare(strict_types=1);

namespace App\Services;

use App\Repositories\AppointmentRepository;
use Exception;

class AppointmentService extends BaseService
{
    private AppointmentRepository $appointmentRepo;

    public function __construct()
    {
        $this->appointmentRepo = new AppointmentRepository();
    }

    public function getAppointments(string $start, string $end, ?int $branchId = null): array
    {
        return $this->appointmentRepo->getInRange($start, $end, $branchId);
    }

    public function createAppointment(array $data): int
    {
        \App\Core\Database\DatabaseManager::beginTransaction();

        try {
            $this->validateAvailability($data);

            $status = $data['status'] ?? 'pending';
            $isBlocked = $status === 'blocked';

            $serviceId = (int)($data['service_id'] ?? 0);
            $customerId = (int)($data['customer_id'] ?? 0);
            $staffId = (int)($data['staff_id'] ?? 0);

            if (!$isBlocked && (!$serviceId || !$customerId || !$staffId)) {
                throw new Exception("Customer, Service, and Staff must all be selected.");
            }

            if ($isBlocked && !$staffId && ($data['staff_id'] !== 'all')) {
                throw new Exception("Please select a staff member to block time for.");
            }

            unset($data['service_id']); // Remove it as it's not in appointments table

            if ($isBlocked) {
                \App\Core\Database\DatabaseManager::query(
                    "INSERT INTO salon_blocked_times (salon_id, staff_id, block_date, start_time, end_time, reason) 
                     VALUES (:salon_id, :staff_id, :block_date, :start_time, :end_time, :reason)",
                    [
                        'salon_id'   => \App\Core\Auth\TenantContext::getTenantId(),
                        'staff_id'   => ($data['staff_id'] === 'all') ? null : $data['staff_id'],
                        'block_date' => $data['appointment_date'],
                        'start_time' => $data['start_time'],
                        'end_time'   => $data['end_time'],
                        'reason'     => $data['notes'] ?? 'Personal Block'
                    ]
                );
                \App\Core\Database\DatabaseManager::commit();
                return 0;
            }

            $appointmentId = $this->appointmentRepo->create($data);

            if ($serviceId) {
                // 1. Insert into appointment_services
                \App\Core\Database\DatabaseManager::query(
                    "INSERT INTO appointment_services (appointment_id, service_id, price, duration_minutes) 
                     SELECT :appointment_id, id, price, duration_minutes FROM services WHERE id = :service_id",
                    [
                        'appointment_id' => $appointmentId,
                        'service_id' => (int) $serviceId
                    ]
                );

                // 2. Update total_amount in appointments table based on linked services
                \App\Core\Database\DatabaseManager::query(
                    "UPDATE appointments SET total_amount = (
                        SELECT COALESCE(SUM(price), 0) FROM appointment_services WHERE appointment_id = :aid1
                    ) WHERE id = :aid2",
                    ['aid1' => $appointmentId, 'aid2' => $appointmentId]
                );
            }

            \App\Core\Database\DatabaseManager::commit();

            try {
                $this->sendBookingSms($customerId, $serviceId, $data['appointment_date'], $data['start_time']);
            } catch (Exception $ex) {
                // Ignore SMS dispatch failures
            }

            try {
                $this->sendBookingEmail($customerId, $serviceId, $data['appointment_date'], $data['start_time']);
            } catch (Exception $ex) {
                // Ignore Email dispatch failures, but log the details
                $logDir = __DIR__ . '/../../scratch';
                if (!is_dir($logDir)) {
                    mkdir($logDir, 0777, true);
                }
                $logFile = $logDir . '/emails.log';
                $msg = sprintf("[%s] [Dashboard Booking] Exception during booking email send: %s\n", date('Y-m-d H:i:s'), $ex->getMessage());
                file_put_contents($logFile, $msg, FILE_APPEND);
            }

            return $appointmentId;

        } catch (Exception $e) {
            \App\Core\Database\DatabaseManager::rollBack();
            throw $e;
        }
    }

    public function updateAppointment(int $id, array $data): bool
    {
        $this->validateAvailability($data, $id);
        
        $oldApt = $this->appointmentRepo->find($id);
        
        if (isset($data['service_id'])) {
            unset($data['service_id']);
        }
        
        $oldStatus = $oldApt['status'] ?? 'pending';
        $newStatus = $data['status'] ?? $oldStatus;

        if ($oldStatus !== 'in_progress' && $newStatus === 'in_progress') {
            $data['actual_start_time'] = date('Y-m-d H:i:s');
        }
        if ($oldStatus !== 'completed' && $newStatus === 'completed') {
            $data['actual_end_time'] = date('Y-m-d H:i:s');
        }

        $updated = $this->appointmentRepo->update($id, $data);
        
        if ($updated && $oldApt) {
            $oldStatus = $oldApt['status'] ?? 'pending';
            $newStatus = $data['status'] ?? $oldStatus;
            
            if ($oldStatus !== 'confirmed' && $newStatus === 'confirmed') {
                try {
                    $customerId = (int)($data['customer_id'] ?? $oldApt['customer_id']);
                    
                    $serviceId = 0;
                    if (isset($data['service_id'])) {
                        $serviceId = (int)$data['service_id'];
                    } else {
                        $sqlService = "SELECT service_id FROM appointment_services WHERE appointment_id = :id LIMIT 1";
                        $serviceRow = \App\Core\Database\DatabaseManager::query($sqlService, ['id' => $id])->fetch();
                        if ($serviceRow) {
                            $serviceId = (int)$serviceRow['service_id'];
                        }
                    }
                    
                    $aptDate = $data['appointment_date'] ?? $oldApt['appointment_date'];
                    $startTime = $data['start_time'] ?? $oldApt['start_time'];
                    
                    $this->sendBookingEmail($customerId, $serviceId, $aptDate, $startTime);
                } catch (\Exception $ex) {
                    $logDir = __DIR__ . '/../../scratch';
                    if (!is_dir($logDir)) {
                        mkdir($logDir, 0777, true);
                    }
                    $logFile = $logDir . '/emails.log';
                    $msg = sprintf("[%s] [Appointment Approval] Exception sending email: %s\n", date('Y-m-d H:i:s'), $ex->getMessage());
                    file_put_contents($logFile, $msg, FILE_APPEND);
                }
            }

            if ($oldStatus !== 'cancelled' && $newStatus === 'cancelled') {
                try {
                    $customerId = (int)($data['customer_id'] ?? $oldApt['customer_id']);
                    
                    $serviceId = 0;
                    if (isset($data['service_id'])) {
                        $serviceId = (int)$data['service_id'];
                    } else {
                        $sqlService = "SELECT service_id FROM appointment_services WHERE appointment_id = :id LIMIT 1";
                        $serviceRow = \App\Core\Database\DatabaseManager::query($sqlService, ['id' => $id])->fetch();
                        if ($serviceRow) {
                            $serviceId = (int)$serviceRow['service_id'];
                        }
                    }
                    
                    $aptDate = $data['appointment_date'] ?? $oldApt['appointment_date'];
                    $startTime = $data['start_time'] ?? $oldApt['start_time'];
                    
                    $this->sendCancellationEmail($customerId, $serviceId, $aptDate, $startTime);
                } catch (\Exception $ex) {
                    $logDir = __DIR__ . '/../../scratch';
                    if (!is_dir($logDir)) {
                        mkdir($logDir, 0777, true);
                    }
                    $logFile = $logDir . '/emails.log';
                    $msg = sprintf("[%s] [Appointment Cancellation] Exception sending email: %s\n", date('Y-m-d H:i:s'), $ex->getMessage());
                    file_put_contents($logFile, $msg, FILE_APPEND);
                }
            }
        }
        
        return $updated;
    }

    private function validateAvailability(array $data, ?int $excludeId = null): void
    {
        if (!isset($data['staff_id'], $data['appointment_date'], $data['start_time'], $data['end_time'])) {
            return; // Basic validation would usually catch this before service
        }

        if (
            $this->appointmentRepo->hasOverlap(
                (int) $data['staff_id'],
                $data['appointment_date'],
                $data['start_time'],
                $data['end_time'],
                $excludeId
            )
        ) {
            throw new Exception("The selected staff member is already booked for this time slot.");
        }
    }

    public function deleteAppointment(int $id): bool
    {
        return $this->appointmentRepo->delete($id);
    }

    public function getCustomerAppointments(int $customerId): array
    {
        return $this->appointmentRepo->getByCustomer($customerId);
    }

    private function sendBookingSms(int $customerId, int $serviceId, string $date, string $time): void
    {
        $salonId = \App\Core\Auth\TenantContext::getTenantId();
        if (!$salonId) return;

        $settingsRepo = new \App\Repositories\SettingsRepository();
        $settings = $settingsRepo->getAllKeyValue();

        if (($settings['sms_enabled'] ?? '0') !== '1' || ($settings['sms_on_booking'] ?? '0') !== '1') {
            return;
        }

        $customer = \App\Core\Database\DatabaseManager::query(
            "SELECT name, phone FROM customers WHERE id = :id AND salon_id = :salon_id LIMIT 1",
            ['id' => $customerId, 'salon_id' => $salonId]
        )->fetch();

        if (!$customer || empty($customer['phone'])) {
            return;
        }

        $salon = \App\Core\Database\DatabaseManager::query(
            "SELECT name FROM salons WHERE id = :id LIMIT 1",
            ['id' => $salonId]
        )->fetch();
        $salonName = $salon['name'] ?? 'Our Salon';

        $serviceName = '';
        if ($serviceId > 0) {
            $service = \App\Core\Database\DatabaseManager::query(
                "SELECT name FROM services WHERE id = :id LIMIT 1",
                ['id' => $serviceId]
            )->fetch();
            $serviceName = $service ? $service['name'] : '';
        }

        $timeStr = date("g:i A", strtotime($time));
        $msg = "Dear " . $customer['name'] . ", your booking for " . ($serviceName ? $serviceName . " " : "") . "at " . $salonName . " is confirmed on " . $date . " at " . $timeStr . ". Thank you!";

        $smsService = new \App\Services\SmsService();
        $smsService->sendSms($customer['phone'], $msg);
    }

    private function sendBookingEmail(int $customerId, int $serviceId, string $date, string $time): void
    {
        $salonId = \App\Core\Auth\TenantContext::getTenantId();
        if (!$salonId) return;

        $settingsRepo = new \App\Repositories\SettingsRepository();
        $settings = $settingsRepo->getAllKeyValue();

        $logDir = __DIR__ . '/../../scratch';
        if (!is_dir($logDir)) {
            mkdir($logDir, 0777, true);
        }
        $logFile = $logDir . '/emails.log';

        if (($settings['email_enabled'] ?? '0') !== '1') {
            $msg = sprintf("[%s] [Dashboard Booking] [Salon ID: %d] Skip email: email_enabled is disabled in settings.\n", date('Y-m-d H:i:s'), $salonId);
            file_put_contents($logFile, $msg, FILE_APPEND);
            return;
        }

        if (($settings['email_on_booking'] ?? '0') !== '1') {
            $msg = sprintf("[%s] [Dashboard Booking] [Salon ID: %d] Skip email: email_on_booking is disabled in settings.\n", date('Y-m-d H:i:s'), $salonId);
            file_put_contents($logFile, $msg, FILE_APPEND);
            return;
        }

        $customer = \App\Core\Database\DatabaseManager::query(
            "SELECT name, email FROM customers WHERE id = :id AND salon_id = :salon_id LIMIT 1",
            ['id' => $customerId, 'salon_id' => $salonId]
        )->fetch();

        if (!$customer) {
            $msg = sprintf("[%s] [Dashboard Booking] [Salon ID: %d] Skip email: Customer ID %d not found.\n", date('Y-m-d H:i:s'), $salonId, $customerId);
            file_put_contents($logFile, $msg, FILE_APPEND);
            return;
        }

        if (empty($customer['email'])) {
            $msg = sprintf("[%s] [Dashboard Booking] [Salon ID: %d] Skip email: Customer '%s' (ID %d) has no email address.\n", date('Y-m-d H:i:s'), $salonId, $customer['name'], $customerId);
            file_put_contents($logFile, $msg, FILE_APPEND);
            return;
        }

        $salon = \App\Core\Database\DatabaseManager::query(
            "SELECT name FROM salons WHERE id = :id LIMIT 1",
            ['id' => $salonId]
        )->fetch();
        $salonName = $salon['name'] ?? 'Our Salon';

        $serviceName = '';
        $durationMinutes = 30;
        if ($serviceId > 0) {
            $service = \App\Core\Database\DatabaseManager::query(
                "SELECT name, duration_minutes FROM services WHERE id = :id LIMIT 1",
                ['id' => $serviceId]
            )->fetch();
            $serviceName = $service ? $service['name'] : '';
            $durationMinutes = $service ? (int)$service['duration_minutes'] : 30;
        }

        $timeStr = date("g:i A", strtotime($time));

        $emailService = new \App\Services\EmailService();

        $subject = $settings['email_booking_subject'] ?? '';
        if (empty($subject)) {
            $subject = 'Appointment Booking Confirmation';
        }

        $template = $settings['email_booking_template'] ?? '';
        if (empty($template)) {
            $template = "Hello {customer_name},\n\nYour appointment at {salon_name} has been successfully booked.\n\nDetails:\nDate: {appointment_date}\nTime: {appointment_time}\nService: {service_name}\n\nThank you for choosing us!\nBest regards,\n{salon_name}";
        }

        $placeholders = [
            'customer_name' => $customer['name'],
            'salon_name' => $salonName,
            'appointment_date' => $date,
            'appointment_time' => $timeStr,
            'service_name' => $serviceName
        ];

        $subject = $emailService->formatTemplate($subject, $placeholders);
        $body = $emailService->formatTemplate($template, $placeholders);

        $calendarEvent = [
            'title' => "Appointment: " . ($serviceName ? $serviceName : 'Salon Service') . " at " . $salonName,
            'date' => $date,
            'time' => $time,
            'duration' => $durationMinutes,
            'description' => "Your appointment for " . ($serviceName ? $serviceName : 'service') . " at " . $salonName . " is scheduled on " . $date . " at " . $timeStr . ".",
            'customer_name' => $customer['name'],
            'customer_email' => $customer['email']
        ];

        $emailService->sendEmail($customer['email'], $subject, $body, $calendarEvent);
    }

    private function sendCancellationEmail(int $customerId, int $serviceId, string $date, string $time): void
    {
        $salonId = \App\Core\Auth\TenantContext::getTenantId();
        if (!$salonId) return;

        $settingsRepo = new \App\Repositories\SettingsRepository();
        $settings = $settingsRepo->getAllKeyValue();

        if (($settings['email_enabled'] ?? '0') !== '1') {
            return;
        }

        $customer = \App\Core\Database\DatabaseManager::query(
            "SELECT name, email FROM customers WHERE id = :id AND salon_id = :salon_id LIMIT 1",
            ['id' => $customerId, 'salon_id' => $salonId]
        )->fetch();

        if (!$customer || empty($customer['email'])) {
            return;
        }

        $salon = \App\Core\Database\DatabaseManager::query(
            "SELECT name FROM salons WHERE id = :id LIMIT 1",
            ['id' => $salonId]
        )->fetch();
        $salonName = $salon['name'] ?? 'Our Salon';

        $serviceName = '';
        if ($serviceId > 0) {
            $service = \App\Core\Database\DatabaseManager::query(
                "SELECT name FROM services WHERE id = :id LIMIT 1",
                ['id' => $serviceId]
            )->fetch();
            $serviceName = $service ? $service['name'] : '';
        }

        $timeStr = date("g:i A", strtotime($time));

        $emailService = new \App\Services\EmailService();

        $subject = 'Appointment Cancelled / Declined';
        $template = "Hello {customer_name},\n\nWe regret to inform you that your appointment request at {salon_name} has been declined or cancelled.\n\nDetails:\nDate: {appointment_date}\nTime: {appointment_time}\nService: {service_name}\n\nIf you have any questions or would like to reschedule, please contact us directly.\n\nBest regards,\n{salon_name}";

        $placeholders = [
            'customer_name' => $customer['name'],
            'salon_name' => $salonName,
            'appointment_date' => $date,
            'appointment_time' => $timeStr,
            'service_name' => $serviceName
        ];

        $subject = $emailService->formatTemplate($subject, $placeholders);
        $body = $emailService->formatTemplate($template, $placeholders);

        $emailService->sendEmail($customer['email'], $subject, $body, null);
    }
}

