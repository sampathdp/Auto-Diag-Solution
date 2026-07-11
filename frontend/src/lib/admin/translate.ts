/**
 * Best-effort EN→AR auto-fill using Google's free, unofficial "gtx" translate
 * endpoint (no API key). Not an SLA'd/documented API — treat failures as
 * expected and always fail silently, letting the user type the translation
 * in by hand.
 */
export async function translateEnToAr(text: string): Promise<string | null> {
  const trimmed = text.trim();
  if (!trimmed) return null;

  try {
    const res = await fetch(
      `https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=ar&dt=t&q=${encodeURIComponent(trimmed)}`
    );
    if (!res.ok) return null;

    const data = await res.json();
    const translated = (data?.[0] as [string, string][] | undefined)
      ?.map(([chunk]) => chunk)
      .join("")
      .trim();

    return translated || null;
  } catch {
    return null;
  }
}
