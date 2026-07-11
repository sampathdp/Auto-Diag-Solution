"use client";

import { useState } from "react";
import { useFieldArray, type UseFormReturn } from "react-hook-form";
import { Plus, Trash2, Languages } from "lucide-react";
import { Card, CardHeader, CardBody } from "@/components/admin/ui/Card";
import { Input } from "@/components/admin/ui/Input";
import { Button } from "@/components/admin/ui/Button";
import { showError } from "@/components/admin/ui/toast";
import { translateEnToAr } from "@/lib/admin/translate";
import type { ProductFormValues } from "@/lib/admin/schemas/productSchema";

/** Row+column identifies which cell is mid-translation — only one row array, so a single
 * shared slot (rather than a hook-per-row, which would break the rules of hooks) is enough. */
type TranslatingCell = { index: number; column: "key" | "value" } | null;

export function SpecificationsCard({ form }: { form: UseFormReturn<ProductFormValues> }) {
  const { control, register, watch, setValue } = form;
  const { fields, append, remove } = useFieldArray({ control, name: "specifications" });
  const [translatingCell, setTranslatingCell] = useState<TranslatingCell>(null);

  const translateCell = async (index: number, column: "key" | "value") => {
    const enValue = watch(`specifications.${index}.${column}_en`);
    if (!enValue?.trim()) return;
    setTranslatingCell({ index, column });
    const translated = await translateEnToAr(enValue);
    setTranslatingCell(null);
    if (translated) setValue(`specifications.${index}.${column}_ar`, translated);
    else showError("Couldn't auto-translate — please enter the Arabic text manually.");
  };

  return (
    <Card>
      <CardHeader className="flex items-center justify-between">
        <h2 className="text-h4 font-bold text-ink">Specifications</h2>
        <Button
          type="button"
          variant="secondary"
          size="sm"
          onClick={() => append({ key_en: "", key_ar: "", value_en: "", value_ar: "" })}
        >
          <Plus className="h-3.5 w-3.5" />
          Add Row
        </Button>
      </CardHeader>
      <CardBody className="space-y-3">
        {fields.length === 0 ? (
          <p className="text-body text-ink-muted">No specifications yet — add weight, material, warranty, etc.</p>
        ) : (
          <>
            <div className="hidden grid-cols-[1fr_1fr_1fr_1fr_auto] gap-2 text-caption font-semibold uppercase tracking-wide text-ink-muted sm:grid">
              <span>Key (EN)</span>
              <span>Key (AR)</span>
              <span>Value (EN)</span>
              <span>Value (AR)</span>
              <span />
            </div>
            {fields.map((field, index) => (
              <div key={field.id} className="grid grid-cols-2 gap-2 sm:grid-cols-[1fr_1fr_1fr_1fr_auto]">
                <Input placeholder="Weight" {...register(`specifications.${index}.key_en`)} />
                <div className="flex items-center gap-1">
                  <Input placeholder="الوزن" dir="rtl" className="flex-1" {...register(`specifications.${index}.key_ar`)} />
                  <button
                    type="button"
                    onClick={() => translateCell(index, "key")}
                    disabled={translatingCell?.index === index && translatingCell.column === "key"}
                    aria-label="Translate key to Arabic"
                    className="shrink-0 rounded-sm p-1.5 text-ink-muted hover:bg-app hover:text-primary disabled:opacity-40"
                  >
                    <Languages className="h-3.5 w-3.5" />
                  </button>
                </div>
                <Input placeholder="1.2 kg" {...register(`specifications.${index}.value_en`)} />
                <div className="flex items-center gap-1">
                  <Input placeholder="1.2 كجم" dir="rtl" className="flex-1" {...register(`specifications.${index}.value_ar`)} />
                  <button
                    type="button"
                    onClick={() => translateCell(index, "value")}
                    disabled={translatingCell?.index === index && translatingCell.column === "value"}
                    aria-label="Translate value to Arabic"
                    className="shrink-0 rounded-sm p-1.5 text-ink-muted hover:bg-app hover:text-primary disabled:opacity-40"
                  >
                    <Languages className="h-3.5 w-3.5" />
                  </button>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => remove(index)}
                  aria-label="Remove specification"
                  className="col-span-2 justify-center text-danger sm:col-span-1"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            ))}
          </>
        )}
      </CardBody>
    </Card>
  );
}
