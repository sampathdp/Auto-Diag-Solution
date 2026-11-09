import { showError, showSuccess } from "@/components/admin/ui/toast";

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

const MAX_CHUNK = 1000;

function chunkText(text: string): string[] {
  if (text.length <= MAX_CHUNK) return [text];
  const parts = text.match(/[^.!?\n]+[.!?\n]*\s*/g) ?? [text];
  const chunks: string[] = [];
  let cur = "";
  for (const p of parts) {
    if (cur && (cur + p).length > MAX_CHUNK) {
      chunks.push(cur);
      cur = "";
    }
    cur += p;
  }
  if (cur) chunks.push(cur);
  return chunks;
}

/** Translates text of any length (chunked). Returns null if any chunk fails. */
async function translateLong(text: string): Promise<string | null> {
  const out: string[] = [];
  for (const chunk of chunkText(text)) {
    if (!chunk.trim()) {
      out.push(chunk);
      continue;
    }
    const lead = chunk.match(/^\s*/)?.[0] ?? "";
    const trail = chunk.match(/\s*$/)?.[0] ?? "";
    const t = await translateEnToAr(chunk);
    if (!t) return null;
    out.push(lead + t + trail);
  }
  return out.join("");
}

/** Translates the text nodes of an HTML string, keeping tags/attributes intact. */
async function translateHtml(html: string): Promise<string | null> {
  const doc = new DOMParser().parseFromString(`<div id="r">${html}</div>`, "text/html");
  const root = doc.getElementById("r");
  if (!root) return null;

  const nodes: Text[] = [];
  const walker = doc.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  while (walker.nextNode()) {
    const n = walker.currentNode as Text;
    if (n.data.trim()) nodes.push(n);
  }

  const results = await Promise.all(nodes.map((n) => translateLong(n.data)));
  if (results.some((r) => r === null)) return null;
  nodes.forEach((n, i) => {
    n.data = results[i] as string;
  });
  return root.innerHTML;
}

export interface ArabicPair {
  en: string;
  ar: string;
  html?: boolean;
}

/**
 * Save-time guard: makes sure the Arabic side matches the English side.
 * - AR empty                         -> translate EN
 * - EN changed, AR left untouched    -> AR is stale, re-translate EN
 * - EN changed and AR also edited    -> keep the user's Arabic
 * `original` is the record as loaded (null when creating).
 * Never blocks saving: if translation fails the values are returned as-is.
 */
export async function syncArabic<T extends Record<string, unknown>>(
  values: T,
  original: Record<string, unknown> | null,
  pairs: ArabicPair[]
): Promise<{ values: T; fixed: string[]; failed: string[] }> {
  const next = { ...values } as Record<string, unknown>;
  const fixed: string[] = [];
  const failed: string[] = [];

  for (const { en, ar, html } of pairs) {
    const enVal = String(next[en] ?? "");
    if (!enVal.trim()) continue;
    const arVal = String(next[ar] ?? "");
    const enChanged = !original || String(original[en] ?? "") !== enVal;
    const arChanged = !!original && String(original[ar] ?? "") !== arVal;

    const needs = !arVal.trim() || (enChanged && !arChanged);
    if (!needs) continue;

    const translated = html ? await translateHtml(enVal) : await translateLong(enVal);
    if (translated) {
      next[ar] = translated;
      fixed.push(ar);
    } else {
      failed.push(ar);
    }
  }

  return { values: next as T, fixed, failed };
}

/** Pipe `syncArabic(...)` through this to toast the outcome and unwrap the values. */
export function notifyArabic<T>(r: { values: T; fixed: string[]; failed: string[] }): T {
  if (r.fixed.length) showSuccess("Arabic text auto-updated to match the English");
  if (r.failed.length) showError("Couldn't verify the Arabic translation — please check it manually.");
  return r.values;
}
