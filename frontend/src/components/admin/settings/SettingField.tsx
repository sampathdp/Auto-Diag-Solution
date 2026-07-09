"use client";

import { FormField } from "@/components/admin/ui/FormField";
import { Input } from "@/components/admin/ui/Input";
import { Switch } from "@/components/admin/ui/Switch";
import type { Setting } from "@/types/setting";

/**
 * The real backend has 4 value types (string/number/boolean/json) and no
 * label/helper_text/options/readonly columns at all — significantly simpler than
 * the mock's 6-type, richly-described Setting. No "media"/"select"/legal-page-picker
 * field kind exists here because none of the actual seeded settings need one; see
 * ARCHITECTURE.md §8.8.
 */
export function SettingField({
  setting,
  label,
  helperText,
  value,
  onChange,
}: {
  setting: Setting;
  label: string;
  helperText?: string;
  value: string;
  onChange: (value: string) => void;
}) {
  if (setting.type === "boolean") {
    return (
      <FormField label={label} htmlFor={setting.key} helperText={helperText}>
        <Switch
          id={setting.key}
          checked={value === "1" || value === "true"}
          onChange={(e) => onChange(e.target.checked ? "1" : "0")}
        />
      </FormField>
    );
  }

  return (
    <FormField label={label} htmlFor={setting.key} helperText={helperText}>
      <Input
        id={setting.key}
        type={setting.type === "number" ? "number" : "text"}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </FormField>
  );
}
