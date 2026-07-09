"use client";

import { useFieldArray, type UseFormReturn } from "react-hook-form";
import { Plus, Trash2 } from "lucide-react";
import { Card, CardHeader, CardBody } from "@/components/admin/ui/Card";
import { Input } from "@/components/admin/ui/Input";
import { Button } from "@/components/admin/ui/Button";
import type { ProductFormValues } from "@/lib/admin/schemas/productSchema";

export function SpecificationsCard({ form }: { form: UseFormReturn<ProductFormValues> }) {
  const { control, register } = form;
  const { fields, append, remove } = useFieldArray({ control, name: "specifications" });

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
                <Input placeholder="الوزن" dir="rtl" {...register(`specifications.${index}.key_ar`)} />
                <Input placeholder="1.2 kg" {...register(`specifications.${index}.value_en`)} />
                <Input placeholder="1.2 كجم" dir="rtl" {...register(`specifications.${index}.value_ar`)} />
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
