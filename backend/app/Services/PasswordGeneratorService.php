<?php

declare(strict_types=1);

namespace App\Services;

class PasswordGeneratorService
{
    /**
     * Generate a secure, random password
     * Requirements: 12 chars, upper, lower, numbers, symbols
     */
    public function generate(int $length = 14): string
    {
        $uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
        $lowercase = 'abcdefghijklmnopqrstuvwxyz';
        $numbers = '0123456789';
        $symbols = '!@#$%^&*()-_=+[]{}';
        
        $all = $uppercase . $lowercase . $numbers . $symbols;
        $password = '';
        
        // Ensure at least one of each category
        $password .= $uppercase[random_int(0, strlen($uppercase) - 1)];
        $password .= $lowercase[random_int(0, strlen($lowercase) - 1)];
        $password .= $numbers[random_int(0, strlen($numbers) - 1)];
        $password .= $symbols[random_int(0, strlen($symbols) - 1)];
        
        // Fill the rest randomly
        for ($i = 0; $i < $length - 4; $i++) {
            $password .= $all[random_int(0, strlen($all) - 1)];
        }
        
        // Shuffle the characters
        $chars = str_split($password);
        shuffle($chars);
        
        return implode('', $chars);
    }
}
