/**
 * Normalizes a phone number into an international digits-only format for WhatsApp
 * (https://wa.me/<number>?text=...).
 * Strips out '+', spaces, dashes, parentheses.
 * If the number starts with UAE local format '05...', converts to '9715...'.
 */
export function normalizeWhatsAppNumber(raw?: string | null): string {
  if (!raw) return "";
  const digits = raw.replace(/\D/g, "");
  if (!digits) return "";

  // UAE local format starting with 05XXXXXXXX (10 digits) -> 9715XXXXXXXX
  if (digits.startsWith("05") && digits.length === 10) {
    return `971${digits.slice(1)}`;
  }
  // 5XXXXXXXX (9 digits) -> 9715XXXXXXXX
  if (digits.startsWith("5") && digits.length === 9) {
    return `971${digits}`;
  }
  return digits;
}

export const DEFAULT_WHATSAPP_NUMBER = "971501234567";

export function buildWhatsAppUrl(phone?: string | null, message?: string | null): string {
  const number =
    normalizeWhatsAppNumber(phone) ||
    normalizeWhatsAppNumber(process.env.NEXT_PUBLIC_WHATSAPP_NUMBER) ||
    DEFAULT_WHATSAPP_NUMBER;

  const query = message && message.trim() ? `?text=${encodeURIComponent(message.trim())}` : "";
  return `https://wa.me/${number}${query}`;
}

