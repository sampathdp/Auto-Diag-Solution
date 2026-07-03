<?php

declare(strict_types=1);

namespace App\Controllers;

use App\Core\Request;
use App\Repositories\ContactMessageRepository;

class ContactController extends BaseController
{
    private ContactMessageRepository $contactRepo;

    public function __construct()
    {
        $this->contactRepo = new ContactMessageRepository();
    }

    /**
     * Submit Contact Message
     */
    public function submit(Request $request): void
    {
        try {
            $name = trim($request->input('name') ?? '');
            $email = trim($request->input('email') ?? '');
            $subject = trim($request->input('subject') ?? '');
            $message = trim($request->input('message') ?? '');

            if (empty($name)) {
                throw new \Exception("Your name is required.");
            }
            if (strlen($name) < 2) {
                throw new \Exception("Your name must be at least 2 characters.");
            }
            if (empty($email)) {
                throw new \Exception("Your email address is required.");
            }
            if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
                throw new \Exception("Please enter a valid email address.");
            }
            if (empty($message)) {
                throw new \Exception("Message content cannot be empty.");
            }
            if (strlen($message) < 10) {
                throw new \Exception("Please write a message of at least 10 characters.");
            }

            // Save to database
            $this->contactRepo->create([
                'name' => $name,
                'email' => $email,
                'subject' => $subject ?: 'General Inquiry',
                'message' => $message,
                'status' => 'pending'
            ]);

            $this->success(null, 'Your message has been sent successfully. We will get back to you shortly!');
        } catch (\Exception $e) {
            $this->error($e->getMessage());
        }
    }

    /**
     * Admin: Retrieve messages
     */
    public function index(Request $request): void
    {
        try {
            $status = $request->input('status');
            $filters = [];
            if ($status) {
                $filters['status'] = $status;
            }
            $messages = $this->contactRepo->all($filters);
            $this->success($messages);
        } catch (\Exception $e) {
            $this->error($e->getMessage());
        }
    }
}
