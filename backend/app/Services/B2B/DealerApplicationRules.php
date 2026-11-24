<?php

declare(strict_types=1);

namespace App\Services\B2B;

use App\Exceptions\ValidationException;

/**
 * Field rules for a dealer application (UAE). Used for draft saves (format checks on
 * whatever was sent) and for submission (everything required must be present).
 */
final class DealerApplicationRules
{
    public const BUSINESS_TYPES = ['spare_parts_shop', 'garage', 'fleet_operator', 'car_dealer', 'other'];
    public const EMIRATES = ['Abu Dhabi', 'Dubai', 'Sharjah', 'Ajman', 'Umm Al Quwain', 'Ras Al Khaimah', 'Fujairah'];
    public const ID_TYPES = ['emirates_id', 'driving_licence'];

    /** Document types a dealer may upload during application. */
    public const APPLICATION_DOC_TYPES = ['trade_licence', 'trn_certificate', 'emirates_id_front', 'emirates_id_back', 'dl_front', 'dl_back'];

    /** Fields the dealer edits, with the rule each one follows. */
    private const FIELDS = [
        'business_name', 'business_type', 'trade_licence_number', 'trade_licence_expiry', 'trn',
        'business_email', 'business_phone', 'whatsapp_number',
        'owner_name', 'owner_id_type', 'owner_id_number',
        'address_line', 'emirate', 'city', 'area', 'po_box', 'map_url', 'latitude', 'longitude', 'notes',
    ];

    private const REQUIRED_ON_SUBMIT = [
        'business_name', 'business_type', 'trade_licence_number', 'trade_licence_expiry',
        'business_email', 'business_phone', 'owner_name', 'owner_id_type', 'owner_id_number',
        'address_line', 'emirate', 'city',
    ];

    /**
     * Normalises and checks the fields present in $input. Returns only recognised,
     * valid fields as DB-ready values (owner_id_number is returned in clear; the
     * service encrypts it). Throws 422 with a per-field error map.
     *
     * @return array<string, mixed>
     */
    public static function clean(array $input): array
    {
        $out = [];
        $errors = [];

        foreach (self::FIELDS as $field) {
            if (!array_key_exists($field, $input)) {
                continue;
            }
            $raw = $input[$field];
            $value = is_string($raw) ? trim($raw) : $raw;
            if ($value === '' || $value === null) {
                $out[$field] = null;
                continue;
            }

            try {
                $out[$field] = self::cleanField($field, $value, $input);
            } catch (\InvalidArgumentException $e) {
                $errors[$field] = [$e->getMessage()];
            }
        }

        // Coordinates come as a pair or not at all.
        $hasLat = array_key_exists('latitude', $out) && $out['latitude'] !== null;
        $hasLng = array_key_exists('longitude', $out) && $out['longitude'] !== null;
        if ($hasLat !== $hasLng && !isset($errors['latitude']) && !isset($errors['longitude'])) {
            $errors['latitude'] = ['Enter both latitude and longitude, or leave both empty.'];
        }

        if ($errors) {
            throw new ValidationException($errors);
        }
        return $out;
    }

    /**
     * Everything a submission needs: required fields, and the documents that go with
     * the chosen ID type (plus the TRN certificate when a TRN is given).
     *
     * @param array $profile   dealer_profiles row (owner_id_number_enc counts as the ID number)
     * @param string[] $docTypes active document types on file
     */
    public static function assertComplete(array $profile, array $docTypes): void
    {
        $errors = [];
        foreach (self::REQUIRED_ON_SUBMIT as $field) {
            $value = $field === 'owner_id_number' ? ($profile['owner_id_number_enc'] ?? null) : ($profile[$field] ?? null);
            if ($value === null || $value === '') {
                $errors[$field] = ['This field is required.'];
            }
        }

        if (!empty($profile['trade_licence_expiry']) && $profile['trade_licence_expiry'] < date('Y-m-d')) {
            $errors['trade_licence_expiry'] = ['Your trade licence has expired. Renew it before applying.'];
        }

        $needDocs = ['trade_licence'];
        if (($profile['owner_id_type'] ?? '') === 'driving_licence') {
            array_push($needDocs, 'dl_front', 'dl_back');
        } else {
            array_push($needDocs, 'emirates_id_front', 'emirates_id_back');
        }
        if (!empty($profile['trn'])) {
            $needDocs[] = 'trn_certificate';
        }
        foreach ($needDocs as $doc) {
            if (!in_array($doc, $docTypes, true)) {
                $errors["documents.{$doc}"] = ['Please upload this document.'];
            }
        }

        if ($errors) {
            throw new ValidationException($errors, 'Some details are missing. Please complete them and submit again.');
        }
    }

    private static function cleanField(string $field, mixed $value, array $input): mixed
    {
        $str = is_scalar($value) ? (string)$value : throw new \InvalidArgumentException('Invalid value.');

        switch ($field) {
            case 'business_name':
            case 'owner_name':
                return self::text($str, 2, 255);
            case 'business_type':
                return self::oneOf($str, self::BUSINESS_TYPES);
            case 'trade_licence_number':
                if (!preg_match('/^[A-Za-z0-9\/\- ]{3,100}$/', $str)) {
                    throw new \InvalidArgumentException('Use letters, numbers, spaces, / or - only.');
                }
                return strtoupper($str);
            case 'trade_licence_expiry':
                $d = \DateTime::createFromFormat('Y-m-d', $str);
                if (!$d || $d->format('Y-m-d') !== $str) {
                    throw new \InvalidArgumentException('Enter a valid date.');
                }
                return $str;
            case 'trn':
                $digits = preg_replace('/[\s-]/', '', $str);
                if (!preg_match('/^\d{15}$/', $digits)) {
                    throw new \InvalidArgumentException('A TRN has exactly 15 digits.');
                }
                return $digits;
            case 'business_email':
                $email = strtolower($str);
                if (strlen($email) > 191 || !filter_var($email, FILTER_VALIDATE_EMAIL)) {
                    throw new \InvalidArgumentException('Enter a valid email address.');
                }
                return $email;
            case 'business_phone':
            case 'whatsapp_number':
                return self::phone($str);
            case 'owner_id_type':
                return self::oneOf($str, self::ID_TYPES);
            case 'owner_id_number':
                $type = (string)($input['owner_id_type'] ?? 'emirates_id');
                if ($type === 'emirates_id') {
                    $digits = preg_replace('/[\s-]/', '', $str);
                    if (!preg_match('/^784\d{12}$/', $digits)) {
                        throw new \InvalidArgumentException('An Emirates ID number has 15 digits and starts with 784.');
                    }
                    return substr($digits, 0, 3) . '-' . substr($digits, 3, 4) . '-' . substr($digits, 7, 7) . '-' . substr($digits, 14, 1);
                }
                if (!preg_match('/^[A-Za-z0-9\-]{4,20}$/', $str)) {
                    throw new \InvalidArgumentException('Enter the licence number as shown on the card.');
                }
                return strtoupper($str);
            case 'address_line':
                return self::text($str, 3, 255);
            case 'emirate':
                return self::oneOf($str, self::EMIRATES);
            case 'city':
                return self::text($str, 2, 100);
            case 'area':
                return self::text($str, 1, 150);
            case 'po_box':
                if (!preg_match('/^\d{1,10}$/', $str)) {
                    throw new \InvalidArgumentException('Enter the P.O. Box number (digits only).');
                }
                return $str;
            case 'map_url':
                $scheme = strtolower((string)parse_url($str, PHP_URL_SCHEME));
                if (strlen($str) > 500 || !filter_var($str, FILTER_VALIDATE_URL) || !in_array($scheme, ['http', 'https'], true)) {
                    throw new \InvalidArgumentException('Paste a full map link starting with https://');
                }
                return $str;
            case 'latitude':
                return self::coordinate($str, 90);
            case 'longitude':
                return self::coordinate($str, 180);
            case 'notes':
                return self::text($str, 1, 2000);
        }
        throw new \InvalidArgumentException('Unknown field.');
    }

    private static function text(string $v, int $min, int $max): string
    {
        $len = mb_strlen($v);
        if ($len < $min || $len > $max) {
            throw new \InvalidArgumentException("Must be between {$min} and {$max} characters.");
        }
        return $v;
    }

    private static function oneOf(string $v, array $allowed): string
    {
        if (!in_array($v, $allowed, true)) {
            throw new \InvalidArgumentException('Choose one of the listed options.');
        }
        return $v;
    }

    private static function phone(string $v): string
    {
        $normalized = preg_replace('/[\s\-()]/', '', $v);
        if (!preg_match('/^\+?\d{7,15}$/', $normalized)) {
            throw new \InvalidArgumentException('Enter a phone number with country code, e.g. +971 50 123 4567.');
        }
        return $normalized;
    }

    private static function coordinate(string $v, int $bound): string
    {
        if (!is_numeric($v) || abs((float)$v) > $bound) {
            throw new \InvalidArgumentException("Must be a number between -{$bound} and {$bound}.");
        }
        return number_format((float)$v, 7, '.', '');
    }
}

