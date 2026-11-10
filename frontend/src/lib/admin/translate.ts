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
export async function syncArabic<T extends object>(
  values: T,
  original: object | null,
  pairs: ArabicPair[]
): Promise<{ values: T; fixed: string[]; failed: string[] }> {
  const next = { ...values } as Record<string, unknown>;
  const orig = original as Record<string, unknown> | null;
  const fixed: string[] = [];
  const failed: string[] = [];

  for (const { en, ar, html } of pairs) {
    const enVal = String(next[en] ?? "");
    if (!enVal.trim()) continue;
    const arVal = String(next[ar] ?? "");
    const enChanged = !orig || String(orig[en] ?? "") !== enVal;
    const arChanged = !!orig && String(orig[ar] ?? "") !== arVal;

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

  return { values: next as unknown as T, fixed, failed };
}

/**
 * Walks a nested object and, for every `<name>_en` / `<name>_ar` pair, translates the
 * English text into Arabic. Returns dotted paths (e.g. "values.items.0.title_ar") with
 * the new Arabic value, ready for react-hook-form `setValue`. Pairs that fail are skipped.
 */
export async function translateAllArabic(
  values: unknown
): Promise<{ updates: { path: string; value: string }[]; failed: number }> {
  const jobs: { path: string; en: string }[] = [];
  const walk = (node: unknown, prefix: string) => {
    if (Array.isArray(node)) {
      node.forEach((v, i) => walk(v, prefix ? `${prefix}.${i}` : String(i)));
    } else if (node && typeof node === "object") {
      const obj = node as Record<string, unknown>;
      for (const [k, v] of Object.entries(obj)) {
        const path = prefix ? `${prefix}.${k}` : k;
        if (k.endsWith("_en") && typeof v === "string" && v.trim() && `${k.slice(0, -3)}_ar` in obj) {
          if (/[A-Za-z]/.test(v)) jobs.push({ path: `${prefix ? prefix + "." : ""}${k.slice(0, -3)}_ar`, en: v });
        } else if (v && typeof v === "object") {
          walk(v, path);
        }
      }
    }
  };
  walk(values, "");

  const updates: { path: string; value: string }[] = [];
  let failed = 0;
  const BATCH = 5;
  for (let i = 0; i < jobs.length; i += BATCH) {
    const res = await Promise.all(jobs.slice(i, i + BATCH).map((j) => translateLong(j.en)));
    res.forEach((t, idx) => {
      if (t) updates.push({ path: jobs[i + idx].path, value: t });
      else failed++;
    });
  }
  return { updates, failed };
}

/** Pipe `syncArabic(...)` through this to toast the outcome and unwrap the values. */
export function notifyArabic<T>(r: { values: T; fixed: string[]; failed: string[] }): T {
  if (r.fixed.length) showSuccess("Arabic text auto-updated to match the English");
  if (r.failed.length) showError("Couldn't verify the Arabic translation — please check it manually.");
  return r.values;
}
