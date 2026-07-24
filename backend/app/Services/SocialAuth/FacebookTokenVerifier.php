<?php

declare(strict_types=1);

namespace App\Services\SocialAuth;

/**
 * Verifies a Facebook access token server-side. Graph API's /me endpoint accepts
 * ANY valid access token regardless of which app issued it, so fetching a profile
 * from it alone is not proof the token was meant for this app. debug_token closes
 * that gap by returning the issuing app_id, which we check against FACEBOOK_APP_ID
 * before trusting anything from /me.
 */
class FacebookTokenVerifier
{
    private const GRAPH_VERSION = 'v19.0';

    /**
     * @return array{oauth_id: string, email: string, name: string}
     */
    public function verify(string $accessToken): array
    {
        $appId = trim((string)($_ENV['FACEBOOK_APP_ID'] ?? ''));
        $appSecret = trim((string)($_ENV['FACEBOOK_APP_SECRET'] ?? ''));
        if ($appId === '' || $appSecret === '') {
            throw new SocialAuthException('Facebook sign-in is not configured (set FACEBOOK_APP_ID / FACEBOOK_APP_SECRET)');
        }

        $debug = $this->get('/debug_token', [
            'input_token' => $accessToken,
            'access_token' => $appId . '|' . $appSecret,
        ]);
        $data = $debug['data'] ?? null;

        if (!is_array($data) || empty($data['is_valid']) || (string)($data['app_id'] ?? '') !== $appId) {
            throw new SocialAuthException('Invalid or expired Facebook sign-in token');
        }

        $profile = $this->get('/me', [
            'fields' => 'id,name,email',
            'access_token' => $accessToken,
        ]);

        if (empty($profile['id']) || (string)$profile['id'] !== (string)($data['user_id'] ?? '')) {
            throw new SocialAuthException('Invalid Facebook sign-in token');
        }

        // Graph only returns `email` when Facebook considers it verified.
        if (empty($profile['email'])) {
            throw new SocialAuthException('Facebook account email is not verified');
        }

        return [
            'oauth_id' => (string)$profile['id'],
            'email' => strtolower((string)$profile['email']),
            'name' => (string)($profile['name'] ?? $profile['email']),
        ];
    }

    private function get(string $path, array $query): array
    {
        $url = 'https://graph.facebook.com/' . self::GRAPH_VERSION . $path . '?' . http_build_query($query);

        $ch = curl_init($url);
        curl_setopt_array($ch, [
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_TIMEOUT => 8,
            CURLOPT_CONNECTTIMEOUT => 5,
        ]);

        $body = curl_exec($ch);
        if ($body === false) {
            $error = curl_error($ch);
            curl_close($ch);
            throw new SocialAuthException("Could not reach Facebook to verify sign-in: {$error}");
        }

        $statusCode = (int)curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);

        $decoded = json_decode((string)$body, true);

        if ($statusCode !== 200 || !is_array($decoded)) {
            throw new SocialAuthException('Invalid or expired Facebook sign-in token');
        }

        return $decoded;
    }
}
