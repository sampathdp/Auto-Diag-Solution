<?php

declare(strict_types=1);

namespace App\Services\SocialAuth;

/**
 * Verifies a Google Identity Services ID token server-side via Google's tokeninfo
 * endpoint. Simpler than fetching/caching Google's JWKS and verifying the RS256
 * signature ourselves, and fine at this app's request volume (Google's own docs
 * call this endpoint out as a valid option, just not recommended at very high QPS).
 */
class GoogleTokenVerifier
{
    /**
     * @return array{oauth_id: string, email: string, name: string}
     */
    public function verify(string $idToken): array
    {
        $clientId = trim((string)($_ENV['GOOGLE_CLIENT_ID'] ?? ''));
        if ($clientId === '') {
            throw new SocialAuthException('Google sign-in is not configured (set GOOGLE_CLIENT_ID)');
        }

        $ch = curl_init('https://oauth2.googleapis.com/tokeninfo?id_token=' . rawurlencode($idToken));
        curl_setopt_array($ch, [
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_TIMEOUT => 8,
            CURLOPT_CONNECTTIMEOUT => 5,
        ]);

        $body = curl_exec($ch);
        if ($body === false) {
            $error = curl_error($ch);
            curl_close($ch);
            throw new SocialAuthException("Could not reach Google to verify sign-in: {$error}");
        }

        $statusCode = (int)curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);

        $claims = json_decode((string)$body, true);

        if ($statusCode !== 200 || !is_array($claims)) {
            throw new SocialAuthException('Invalid or expired Google sign-in token');
        }

        if (($claims['aud'] ?? null) !== $clientId) {
            throw new SocialAuthException('Google sign-in token was not issued for this app');
        }

        if (!in_array($claims['iss'] ?? null, ['accounts.google.com', 'https://accounts.google.com'], true)) {
            throw new SocialAuthException('Invalid Google sign-in token issuer');
        }

        if (($claims['email_verified'] ?? 'false') !== 'true' || empty($claims['email'])) {
            throw new SocialAuthException('Google account email is not verified');
        }

        if (empty($claims['sub'])) {
            throw new SocialAuthException('Invalid Google sign-in token');
        }

        return [
            'oauth_id' => (string)$claims['sub'],
            'email' => strtolower((string)$claims['email']),
            'name' => (string)($claims['name'] ?? $claims['email']),
        ];
    }
}
