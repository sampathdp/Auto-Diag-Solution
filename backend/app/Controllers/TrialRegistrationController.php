<?php

declare(strict_types=1);

namespace App\Controllers;

use App\Core\Request;
use App\Services\TrialRegistrationService;
use App\Services\EmailService;

class TrialRegistrationController extends BaseController
{
    private TrialRegistrationService $trialService;
    private EmailService $emailService;

    public function __construct()
    {
        $this->trialService = new TrialRegistrationService();
        $this->emailService = new EmailService();
    }

    /**
     * Public Trial Registration
     */
    public function register(Request $request): void
    {
        try {
            $data = $request->all();
            $ip = $_SERVER['REMOTE_ADDR'] ?? 'unknown';

            $result = $this->trialService->registerTrial($data, $ip);

            // Send verification email with OTP
            $subject = "Verification Code for Your Free Trial";
            $message = "Hello,\n\n" .
                "Thank you for registering a trial request for \"{$data['salon_name']}\"!\n\n" .
                "Please use the following 6-digit verification code to confirm your email address and submit your trial application:\n\n" .
                "Verification Code: {$result['otp']}\n\n" .
                "Once verified, our team will review your application.\n\n" .
                "Best regards,\n" .
                "The SalonFlow Team";

            $this->emailService->sendSystemEmail($result['email'], $subject, $message);

            $this->success(['email' => $result['email']], 'Verification code sent to your email.');
        } catch (\Exception $e) {
            $this->error($e->getMessage());
        }
    }

    /**
     * Admin: List pending requests
     */
    public function listPending(Request $request): void
    {
        $status = $request->input('status'); // optional filter
        $repo = new \App\Repositories\TrialRegistrationRepository();
        $this->success($repo->getAllRequests($status));
    }

    /**
     * Admin: Approve Request
     */
    public function approve(Request $request): void
    {
        try {
            $id = (int) $request->getParam('id');
            $adminId = (int) ($request->user->id ?? 0);

            $credentials = $this->trialService->approveRequest($id, $adminId);

            // Send email to salon owner with their credentials
            $recipient = $credentials['email'];
            $salonName = $credentials['salon_name'];
            $password = $credentials['password'];
            $loginUrl = ($_ENV['APP_URL'] ?? 'https://salonflow.cloud') . '/login';

            $subject = "Your SalonFlow Trial Request has been Approved!";
            $message = "Hello,\n\n" .
                "We are pleased to inform you that your trial request for \"{$salonName}\" has been approved!\n\n" .
                "Here are your login credentials to access the system:\n" .
                "Login URL: {$loginUrl}\n" .
                "Email Address: {$recipient}\n" .
                "Temporary Password: {$password}\n\n" .
                "Please log in and update your password immediately from your profile settings.\n\n" .
                "Your 14-day trial will start automatically as soon as you log in.\n\n" .
                "Thank you for choosing SalonFlow!\n\n" .
                "Best regards,\n" .
                "The SalonFlow Team";

            $this->emailService->sendSystemEmail($recipient, $subject, $message);

            $this->success($credentials, 'Trial request approved. Account created and login details sent via email.');
        } catch (\Exception $e) {
            $this->error($e->getMessage());
        }
    }

    public function activate(Request $request): void
    {
        try {
            $id = (int) $request->getParam('id');
            $this->trialService->activateTrial($id);
            $this->success(null, 'Trial activated. The 14-day countdown has started!');
        } catch (\Exception $e) {
            $this->error($e->getMessage());
        }
    }

    public function reject(Request $request): void
    {
        try {
            $id = (int) $request->getParam('id');
            $reason = $request->input('reason') ?? '';

            $this->trialService->rejectRequest($id, $reason);

            $this->success(null, 'Trial request rejected.');
        } catch (\Exception $e) {
            $this->error($e->getMessage());
        }
    }

    /**
     * Admin: extend a salon's active trial or subscription by N days
     * Route: POST /admin/subscriptions/{salonId}/extend-trial
     */
    public function extendTrial(Request $request): void
    {
        try {
            $salonId  = (int) $request->getParam('salonId');
            $days     = (int) ($request->input('days') ?? 7);
            $reason   = trim($request->input('reason') ?? '');
            $adminId  = (int) ($request->user->id ?? 0);

            if ($days < 1 || $days > 365) {
                throw new \Exception('Extension days must be between 1 and 365.');
            }

            $sub = \App\Core\Database\DatabaseManager::query(
                "SELECT id, status, expires_at FROM subscriptions WHERE salon_id = :id",
                ['id' => $salonId]
            )->fetch();

            if (!$sub) {
                throw new \Exception('No subscription found for this salon.');
            }

            $currentExpires = $sub['expires_at'] ? strtotime($sub['expires_at']) : time();
            // Always extend from the greater of now or current expiry
            $baseTime   = max($currentExpires, time());
            $newExpires = date('Y-m-d H:i:s', strtotime("+{$days} days", $baseTime));

            \App\Core\Database\DatabaseManager::query(
                "UPDATE subscriptions
                 SET expires_at = :expires_at, status = 'trial',
                     reminder_7d_sent = 0, reminder_3d_sent = 0,
                     reminder_1d_sent = 0, expiry_notified = 0
                 WHERE salon_id = :salon_id",
                ['expires_at' => $newExpires, 'salon_id' => $salonId]
            );

            // Audit log
            \App\Core\Database\DatabaseManager::query(
                "INSERT INTO subscription_audit_log
                    (salon_id, event_type, old_expires_at, new_expires_at, notes, created_by)
                 VALUES (:salon_id, 'extended', :old, :new, :notes, :by)",
                [
                    'salon_id' => $salonId,
                    'old'      => $sub['expires_at'],
                    'new'      => $newExpires,
                    'notes'    => $reason ?: "Extended {$days} days by admin",
                    'by'       => $adminId,
                ]
            );

            $this->success(
                ['new_expires_at' => $newExpires],
                "Trial extended by {$days} day(s). New expiry: {$newExpires}"
            );
        } catch (\Exception $e) {
            $this->error($e->getMessage());
        }
    }

    public function resendOtp(Request $request): void
    {
        try {
            $email = $request->input('email');
            if (empty($email)) {
                throw new \Exception("Email is required.");
            }

            $result = $this->trialService->resendOtp($email);

            $subject = "New Verification Code for Your Free Trial";
            $message = "Hello,\n\n" .
                "You requested a new verification code for your SalonFlow trial request.\n\n" .
                "Your new 6-digit verification code is:\n\n" .
                "Verification Code: {$result['otp']}\n\n" .
                "If you did not request this, please ignore this email.\n\n" .
                "Best regards,\n" .
                "The SalonFlow Team";

            $this->emailService->sendSystemEmail($result['email'], $subject, $message);

            $this->success(['email' => $result['email']], 'New verification code sent to your email.');
        } catch (\Exception $e) {
            $this->error($e->getMessage());
        }
    }

    public function verifyEmail(Request $request): void
    {
        try {
            $email = $request->input('email');
            $otp   = $request->input('otp');

            if (empty($email) || empty($otp)) {
                throw new \Exception("Email and verification code are required.");
            }

            $trialRequest = $this->trialService->verifyEmail($email, $otp);
            $requestId    = (int) $trialRequest['id'];

            // Auto-provision: approve → activate → send credentials
            $credentials = $this->trialService->approveRequest($requestId, 0);
            $this->trialService->activateTrial($requestId);

            $loginUrl = rtrim($_ENV['APP_URL'] ?? 'https://salonflow.cloud', '/') . '/login';
            $subject  = "Welcome to SalonFlow — Your Trial is Ready!";
            $message  =
                "Hello {$trialRequest['owner_name']},\n\n" .
                "Your email has been verified and your 14-day free trial for \"{$credentials['salon_name']}\" is now active!\n\n" .
                "Here are your login credentials:\n" .
                "Login URL: {$loginUrl}\n" .
                "Email: {$credentials['email']}\n" .
                "Temporary Password: {$credentials['password']}\n\n" .
                "Please log in and change your password immediately from your profile settings.\n\n" .
                "Enjoy your 14-day trial!\n\n" .
                "Best regards,\n" .
                "The SalonFlow Team";

            $this->emailService->sendSystemEmail($credentials['email'], $subject, $message);

            $this->success(null, 'Email verified! Check your inbox for login details.');
        } catch (\Exception $e) {
            $this->error($e->getMessage());
        }
    }
}
