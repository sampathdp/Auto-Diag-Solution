"use client";

import { useState } from "react";
import { translateEnToAr } from "@/lib/admin/translate";
import { showError } from "@/components/admin/ui/toast";

/** Drives a single "Translate" button — see TranslateLabel for the paired UI. */
export function useTranslate() {
  const [translating, setTranslating] = useState(false);

  const translate = async (text: string): Promise<string | null> => {
    if (!text.trim()) return null;
    setTranslating(true);
    const result = await translateEnToAr(text);
    setTranslating(false);
    if (!result) showError("Couldn't auto-translate — please enter the Arabic text manually.");
    return result;
  };

  return { translating, translate };
}
