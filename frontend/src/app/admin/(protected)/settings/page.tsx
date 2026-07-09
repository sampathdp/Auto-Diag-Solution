"use client";

import { useEffect, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { PageHeader } from "@/components/admin/ui/PageHeader";
import { Button } from "@/components/admin/ui/Button";
import { FullScreenLoader } from "@/components/admin/ui/FullScreenLoader";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/admin/ui/Tabs";
import { SettingField } from "@/components/admin/settings/SettingField";
import { showSuccess } from "@/components/admin/ui/toast";
import { useAdminQuery } from "@/lib/admin/hooks/useAdminQuery";
import { adminApi } from "@/lib/admin/api-client";
import { adminQueryKeys } from "@/lib/admin/query-keys";
import { useUnsavedChangesGuard } from "@/lib/admin/hooks/useUnsavedChangesGuard";
import { SETTING_LABELS, GROUP_LABELS, type Setting } from "@/types/setting";

export default function AdminSettingsPage() {
  const queryClient = useQueryClient();
  // GET /settings already returns a flat array (SettingService::list() -> allGrouped()) —
  // unlike Categories/Products/Vehicles, this endpoint was never paginated.
  const settingsQuery = useAdminQuery<Setting[]>(adminQueryKeys.settings.all, "/settings");

  const [values, setValues] = useState<Record<string, string>>({});
  const [original, setOriginal] = useState<Record<string, string>>({});
  // Tabs are derived from whatever group_name values actually exist in the real
  // data, not a fixed 9-tab list sized for the mock's much larger settings catalog
  // (most of which would render permanently empty against the real 7-setting seed).
  const [activeTab, setActiveTab] = useState<string | null>(null);

  useEffect(() => {
    if (settingsQuery.data) {
      const map = Object.fromEntries(settingsQuery.data.map((s) => [s.key, s.value]));
      setValues(map);
      setOriginal(map);
    }
  }, [settingsQuery.data]);

  const groups = Array.from(new Set((settingsQuery.data ?? []).map((s) => s.group_name ?? "general"))).sort();

  useEffect(() => {
    if (!activeTab && groups.length > 0) setActiveTab(groups[0]);
  }, [activeTab, groups]);

  const isDirty = Object.keys(values).some((key) => values[key] !== original[key]);
  const { confirmDiscard } = useUnsavedChangesGuard(isDirty);

  const save = useMutation({
    mutationFn: (payload: Record<string, string>) => adminApi.put("/settings/bulk", { settings: payload }),
    onSuccess: (_data, payload) => {
      showSuccess("Settings saved");
      setOriginal((prev) => ({ ...prev, ...payload }));
      queryClient.invalidateQueries({ queryKey: adminQueryKeys.settings.all });
    },
  });

  const settingsByGroup = (group: string) => (settingsQuery.data ?? []).filter((s) => (s.group_name ?? "general") === group);

  const saveGroup = (group: string) => {
    const payload = Object.fromEntries(settingsByGroup(group).map((s) => [s.key, values[s.key] ?? ""]));
    save.mutate(payload);
  };

  const groupIsDirty = (group: string) => settingsByGroup(group).some((s) => values[s.key] !== original[s.key]);

  if (settingsQuery.isLoading || !activeTab) return <FullScreenLoader label="Loading settings…" />;

  return (
    <div>
      <PageHeader title="Settings" description="Store-wide configuration." />

      <Tabs
        value={activeTab}
        onValueChange={(next) => {
          if (groupIsDirty(activeTab) && !confirmDiscard(`You have unsaved changes in ${activeTab}. Discard them?`)) {
            return;
          }
          if (groupIsDirty(activeTab)) {
            setValues((prev) => ({
              ...prev,
              ...Object.fromEntries(settingsByGroup(activeTab).map((s) => [s.key, original[s.key]])),
            }));
          }
          setActiveTab(next);
        }}
      >
        <TabsList className="mb-6 flex-wrap">
          {groups.map((group) => (
            <TabsTrigger key={group} value={group}>
              {GROUP_LABELS[group] ?? group}
            </TabsTrigger>
          ))}
        </TabsList>

        {groups.map((group) => (
          <TabsContent key={group} value={group}>
            <div className="rounded-lg border border-border bg-surface p-5 shadow-sm">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                {settingsByGroup(group).map((setting) => (
                  <SettingField
                    key={setting.key}
                    setting={setting}
                    label={SETTING_LABELS[setting.key]?.label ?? setting.key}
                    helperText={SETTING_LABELS[setting.key]?.helperText}
                    value={values[setting.key] ?? ""}
                    onChange={(v) => setValues((prev) => ({ ...prev, [setting.key]: v }))}
                  />
                ))}
              </div>
              <div className="mt-5 flex items-center gap-3 border-t border-border pt-4">
                <Button type="button" onClick={() => saveGroup(group)} loading={save.isPending}>
                  Save {GROUP_LABELS[group] ?? group}
                </Button>
                {groupIsDirty(group) && <span className="text-caption text-ink-muted">Unsaved changes</span>}
              </div>
            </div>
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}
