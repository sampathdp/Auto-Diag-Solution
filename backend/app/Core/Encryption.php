<?php

declare(strict_types=1);

namespace App\Core;

/**
 * AES-256-CBC encryption for secrets that must be stored at rest (e.g.
 * suppliers.api_key) — never for passwords (those stay bcrypt-hashed and
 * one-way via password_hash/password_verify).
 */
class Encryption
{
    private static function key(): string
    {
        $key = $_ENV['APP_ENCRYPTION_KEY'] ?? '';
        if ($key === '') {
            throw new \RuntimeException('APP_ENCRYPTION_KEY environment variable is not configured.');
        }

        // Accept a base64-encoded 32-byte key (the intended format); fall back to
        // hashing an arbitrary passphrase down to 32 bytes so a misconfigured plain
        // string still produces a valid AES-256 key instead of a hard failure.
        $raw = base64_decode($key, true);
        return ($raw !== false && strlen($raw) === 32) ? $raw : hash('sha256', $key, true);
    }

    public static function encrypt(string $plaintext): string
    {
        $iv = random_bytes(16);
        $ciphertext = openssl_encrypt($plaintext, 'aes-256-cbc', self::key(), OPENSSL_RAW_DATA, $iv);
        if ($ciphertext === false) {
            throw new \RuntimeException('Encryption failed.');
        }
        return base64_encode($iv . $ciphertext);
    }

    public static function decrypt(string $encoded): string
    {
        $raw = base64_decode($encoded, true);
        if ($raw === false || strlen($raw) < 17) {
            throw new \RuntimeException('Invalid encrypted payload.');
        }

        $iv = substr($raw, 0, 16);
        $ciphertext = substr($raw, 16);
        $plaintext = openssl_decrypt($ciphertext, 'aes-256-cbc', self::key(), OPENSSL_RAW_DATA, $iv);
        if ($plaintext === false) {
            throw new \RuntimeException('Decryption failed.');
        }

        return $plaintext;
    }
}
