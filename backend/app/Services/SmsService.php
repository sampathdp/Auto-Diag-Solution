<?php

declare(strict_types=1);

namespace App\Services;

use App\Repositories\SettingsRepository;
use App\Core\Auth\TenantContext;

class SmsService
{
    private SettingsRepository $settingsRepo;

    public function __construct()
    {
        $this->settingsRepo = new SettingsRepository();
    }

    /**
     * Send SMS to a recipient using saved settings (verifies gateway status)
     */
    public function sendSms(string $recipient, string $message): array
    {
        $salonId = TenantContext::getTenantId();
        if (!$salonId) {
            return ['success' => false, 'message' => 'Salon context missing.'];
        }
        return $this->sendSmsForSalon($salonId, $recipient, $message);
    }

    /**
     * Send SMS using saved settings for a specific salon ID
     */
    public function sendSmsForSalon(int $salonId, string $recipient, string $message): array
    {
        $settings = $this->settingsRepo->getAllKeyValueForSalon($salonId);
        $smsEnabled = $settings['sms_enabled'] ?? '0';
        
        if ($smsEnabled !== '1') {
            return ['success' => false, 'message' => 'SMS notifications are disabled in settings.'];
        }

        $apiKey = $settings['sms_gateway_api_key'] ?? '';
        $senderId = $settings['sms_gateway_sender_id'] ?? '';

        if (empty($apiKey) || empty($senderId)) {
            return ['success' => false, 'message' => 'SMS Gateway is not fully configured (API Key or Sender ID is missing).'];
        }

        return $this->dispatch($apiKey, $senderId, $recipient, $message);
    }

    /**
     * Send test SMS using temporary variables passed from Settings (un-saved)
     */
    public function sendTestSms(string $apiKey, string $senderId, string $recipient, string $message): array
    {
        if (empty($apiKey) || empty($senderId)) {
            return ['success' => false, 'message' => 'API Key and Sender ID are required to send a test SMS.'];
        }
        return $this->dispatch($apiKey, $senderId, $recipient, $message);
    }

    /**
     * Internal cURL dispatch logic to text.lk
     */
    private function dispatch(string $apiKey, string $senderId, string $recipient, string $message): array
    {
        // Normalize Sri Lankan phone numbers: e.g., 0771234567 -> 94771234567
        $recipient = preg_replace('/[^0-9]/', '', $recipient);
        
        if (strlen($recipient) === 9 && strpos($recipient, '7') === 0) {
            $recipient = '94' . $recipient;
        } elseif (strlen($recipient) === 10 && strpos($recipient, '0') === 0) {
            $recipient = '94' . substr($recipient, 1);
        }

        if (strlen($recipient) < 9) {
            return ['success' => false, 'message' => 'Invalid phone number format.'];
        }

        $url = 'https://app.text.lk/api/v3/sms/send';
        
        $data = [
            'recipient' => $recipient,
            'sender_id' => $senderId,
            'type'      => 'plain',
            'message'   => $message
        ];

        $headers = [
            'Authorization: Bearer ' . $apiKey,
            'Content-Type: application/json',
            'Accept: application/json'
        ];

        $ch = curl_init($url);
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_POST, true);
        curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($data));
        curl_setopt($ch, CURLOPT_HTTPHEADER, $headers);
        curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, true);

        $response = curl_exec($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);

        $responseDecoded = json_decode($response, true);

        if ($httpCode === 200 || ($responseDecoded && isset($responseDecoded['status']) && $responseDecoded['status'] === 'success')) {
            return [
                'success' => true,
                'message' => 'SMS dispatched successfully via text.lk!',
                'data' => $responseDecoded
            ];
        }

        return [
            'success' => false,
            'message' => $responseDecoded['message'] ?? 'SMS Gateway error (HTTP code: ' . $httpCode . ')',
            'data' => $responseDecoded
        ];
    }
}
