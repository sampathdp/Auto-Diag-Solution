/**
 * Reads ?next= from the current URL and returns it only if it is a same-site path
 * (e.g. "/partner/apply"). Anything else (absolute URLs, protocol-relative "//evil.com",
 * backslash tricks) falls back, so the redirect can't be used to send people off-site.
 * The returned path has no locale prefix; the i18n router adds the current one.
 */
export function safeNextPath(fallback: string): string {
  if (typeof window === "undefined") return fallback;
  const next = new URLSearchParams(window.location.search).get("next");
  if (!next || !next.startsWith("/") || next.startsWith("//") || next.includes("\\") || next.includes(":")) {
    return fallback;
  }
  // Strip a leading locale segment if one was included ("/en/partner" -> "/partner").
  return next.replace(/^\/(en|ar)(?=\/|$)/, "") || "/";
}
