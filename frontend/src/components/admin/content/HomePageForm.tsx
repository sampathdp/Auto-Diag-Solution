"use client";

import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardHeader, CardBody } from "@/components/admin/ui/Card";
import { Button } from "@/components/admin/ui/Button";
import { Input } from "@/components/admin/ui/Input";
import { Textarea } from "@/components/admin/ui/Textarea";
import { Select } from "@/components/admin/ui/Select";
import { SingleImageUpload } from "@/components/admin/ui/SingleImageUpload";
import { FormField } from "@/components/admin/ui/FormField";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/admin/ui/Tabs";
import { showError, showSuccess } from "@/components/admin/ui/toast";
import { adminApi, ApiError } from "@/lib/admin/api-client";
import { formatDateTime } from "@/lib/admin/utils";
import { useUnsavedChangesGuard } from "@/lib/admin/hooks/useUnsavedChangesGuard";
import { HomePageFormSchema, type HomePageFormValues } from "@/lib/admin/schemas/homePageSchema";
import { onFormInvalid } from "@/lib/admin/formErrors";
import { WHY_ICONS, type HomePage } from "@/types/homePage";

interface FieldSpec {
  name: string;
  en: string;
  ar: string;
  multiline?: boolean;
}

interface SectionSpec {
  key: "hero" | "about" | "categories" | "products" | "brands" | "cta";
  en: string;
  ar: string;
  fields: FieldSpec[];
}

const SECTIONS: SectionSpec[] = [
  {
    key: "hero",
    en: "Hero",
    ar: "الترويسة",
    fields: [
      { name: "eyebrow", en: "Eyebrow", ar: "النص العلوي" },
      { name: "title_line1", en: "Title — Line 1", ar: "العنوان — السطر 1" },
      { name: "title_line2", en: "Title — Line 2", ar: "العنوان — السطر 2" },
      { name: "title_highlight", en: "Title — Highlighted Word", ar: "العنوان — الكلمة المميزة" },
      { name: "subtitle", en: "Subtitle", ar: "النص الفرعي", multiline: true },
      { name: "credential1", en: "Credential 1", ar: "الميزة 1" },
      { name: "credential2", en: "Credential 2", ar: "الميزة 2" },
      { name: "credential3", en: "Credential 3", ar: "الميزة 3" },
      { name: "cta_shop", en: "Shop Button", ar: "زر التسوق" },
      { name: "cta_finder", en: "Finder Button", ar: "زر البحث" },
    ],
  },
  {
    key: "about",
    en: "About Band",
    ar: "قسم من نحن",
    fields: [
      { name: "eyebrow", en: "Eyebrow", ar: "النص العلوي" },
      { name: "title", en: "Title", ar: "العنوان" },
      { name: "body", en: "Body", ar: "النص", multiline: true },
      { name: "link", en: "Link Label", ar: "نص الرابط" },
      { name: "image_tag", en: "Image Caption", ar: "تعليق الصورة" },
    ],
  },
  {
    key: "categories",
    en: "Categories Section",
    ar: "قسم الفئات",
    fields: [
      { name: "eyebrow", en: "Eyebrow", ar: "النص العلوي" },
      { name: "title", en: "Title", ar: "العنوان" },
    ],
  },
  {
    key: "products",
    en: "Best Sellers Section",
    ar: "قسم الأكثر مبيعًا",
    fields: [
      { name: "eyebrow", en: "Eyebrow", ar: "النص العلوي" },
      { name: "title", en: "Title", ar: "العنوان" },
    ],
  },
  {
    key: "brands",
    en: "Brands Section",
    ar: "قسم العلامات التجارية",
    fields: [
      { name: "eyebrow", en: "Eyebrow", ar: "النص العلوي" },
      { name: "title", en: "Title", ar: "العنوان" },
      { name: "description", en: "Description", ar: "الوصف", multiline: true },
      { name: "link", en: "Link Label", ar: "نص الرابط" },
    ],
  },
  {
    key: "cta",
    en: "Call-to-Action Band",
    ar: "شريط الدعوة للتواصل",
    fields: [
      { name: "title", en: "Title", ar: "العنوان" },
      { name: "button", en: "Button Label", ar: "نص الزر" },
    ],
  },
];

const STAT_LABELS = ["Stat 1", "Stat 2", "Stat 3", "Stat 4"];
const WHY_LABELS = ["Card 1", "Card 2", "Card 3", "Card 4"];

function toFormValues(page: HomePage): HomePageFormValues {
  return {
    hero: page.hero,
    stats: page.stats,
    // Fall back to the legacy single image so existing content shows up as slot 1.
    about: {
      ...page.about,
      images: page.about.images?.length ? page.about.images : page.about.image_url ? [page.about.image_url] : [],
    },
    categories: page.categories,
    products: page.products,
    brands: page.brands,
    why: page.why,
    cta: page.cta,
  };
}

// Keyed by page.updated_at in the parent, so a successful save (which bumps
// updated_at and refetches) remounts this component with the freshly-saved
// values as defaultValues instead of leaving stale dirty state around.
export function HomePageForm({ page }: { page: HomePage }) {
  const queryClient = useQueryClient();
  const initialValues = toFormValues(page);

  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { isDirty },
  } = useForm<HomePageFormValues>({
    resolver: zodResolver(HomePageFormSchema),
    defaultValues: initialValues,
  });

  // Field paths here are built from the spec tables above, so they can't be
  // statically checked against the record-typed schema.
  const reg = (name: string) => register(name as never);

  const { confirmDiscard } = useUnsavedChangesGuard(isDirty);

  const save = useMutation({
    mutationFn: (payload: HomePageFormValues) => adminApi.put<HomePage>("/home-page", payload),
    onSuccess: () => {
      showSuccess("Home page updated");
      queryClient.invalidateQueries({ queryKey: ["home-page"] });
    },
    onError: (err) => showError(err instanceof ApiError ? err.message : "Could not save the home page."),
  });

  const onSubmit = handleSubmit((values) => save.mutate(values), onFormInvalid);

  const renderField = (path: string, lang: "en" | "ar", spec: { multiline?: boolean }, label: string) => {
    const rtl = lang === "ar" ? { dir: "rtl" as const } : {};
    return (
      <FormField key={path} label={label}>
        {spec.multiline ? <Textarea rows={3} {...rtl} {...reg(path)} /> : <Input {...rtl} {...reg(path)} />}
      </FormField>
    );
  };

  const renderLang = (lang: "en" | "ar") => {
    const ar = lang === "ar";
    const L = (en: string, arLabel: string) => (ar ? arLabel : en);

    return (
      <div className="space-y-6" dir={ar ? "rtl" : undefined}>
        {SECTIONS.map((section) => (
          <section key={section.key} className="space-y-4">
            <h3 className="text-label font-bold uppercase tracking-wide text-ink-muted">{L(section.en, section.ar)}</h3>
            {section.fields.map((f) => renderField(`${section.key}.${f.name}_${lang}`, lang, f, L(f.en, f.ar)))}
          </section>
        ))}

        <section className="space-y-4">
          <h3 className="text-label font-bold uppercase tracking-wide text-ink-muted">{L("Stats Strip", "شريط الإحصائيات")}</h3>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {STAT_LABELS.map((label, i) => (
              <div key={label} className="space-y-3 rounded-sm border border-border p-4">
                <p className="text-caption font-bold text-ink-muted">{label}</p>
                {renderField(`stats.items.${i}.value_${lang}`, lang, {}, L("Value", "القيمة"))}
                {renderField(`stats.items.${i}.label_${lang}`, lang, {}, L("Label", "الوصف"))}
              </div>
            ))}
          </div>
        </section>

        <section className="space-y-4">
          <h3 className="text-label font-bold uppercase tracking-wide text-ink-muted">{L("Why Us Section", "قسم لماذا نحن")}</h3>
          {renderField(`why.eyebrow_${lang}`, lang, {}, L("Eyebrow", "النص العلوي"))}
          {renderField(`why.title_${lang}`, lang, {}, L("Title", "العنوان"))}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {WHY_LABELS.map((label, i) => (
              <div key={label} className="space-y-3 rounded-sm border border-border p-4">
                <p className="text-caption font-bold text-ink-muted">{label}</p>
                {renderField(`why.items.${i}.title_${lang}`, lang, {}, L("Title", "العنوان"))}
                {renderField(`why.items.${i}.body_${lang}`, lang, { multiline: true }, L("Body", "الوصف"))}
              </div>
            ))}
          </div>
        </section>
      </div>
    );
  };

  return (
    <form onSubmit={(e) => e.preventDefault()}>
      <div className="space-y-6">
        {/* Image, icons and phone number are language-neutral, shown once regardless of the active tab below */}
        <Card>
          <CardHeader>
            <h2 className="text-h4 font-bold text-ink">About Band — Image Carousel (up to 3)</h2>
          </CardHeader>
          <CardBody className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            {[0, 1, 2].map((i) => (
              <FormField key={i} label={`Image ${i + 1}`}>
                <Controller
                  name="about.images"
                  control={control}
                  render={({ field }) => (
                    <SingleImageUpload
                      value={field.value?.[i]}
                      onChange={(url) => {
                        const slots = [0, 1, 2].map((n) => field.value?.[n] ?? "");
                        slots[i] = url ?? "";
                        field.onChange(slots.filter(Boolean));
                      }}
                    />
                  )}
                />
              </FormField>
            ))}
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <h2 className="text-h4 font-bold text-ink">Why Us Card Icons</h2>
          </CardHeader>
          <CardBody className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {WHY_LABELS.map((label, i) => (
              <FormField key={label} label={label} htmlFor={`why-icon-${i}`}>
                <Controller
                  name={`why.items.${i}.icon`}
                  control={control}
                  render={({ field }) => (
                    <Select id={`why-icon-${i}`} value={field.value} onChange={field.onChange}>
                      {WHY_ICONS.map((icon) => (
                        <option key={icon} value={icon}>
                          {icon}
                        </option>
                      ))}
                    </Select>
                  )}
                />
              </FormField>
            ))}
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <h2 className="text-h4 font-bold text-ink">WhatsApp Number</h2>
          </CardHeader>
          <CardBody>
            <FormField label="Number (digits with country code, e.g. 971501234567)">
              <Input inputMode="numeric" {...reg("cta.whatsapp_number")} />
            </FormField>
          </CardBody>
        </Card>

        <Card>
          <CardBody>
            <Tabs defaultValue="en">
              <TabsList className="mb-4">
                <TabsTrigger value="en">English</TabsTrigger>
                <TabsTrigger value="ar">العربية</TabsTrigger>
              </TabsList>
              <TabsContent value="en">{renderLang("en")}</TabsContent>
              <TabsContent value="ar">{renderLang("ar")}</TabsContent>
            </Tabs>
          </CardBody>
        </Card>

        <Card>
          <CardBody className="text-caption text-ink-muted">
            <p>Last updated {formatDateTime(page.updated_at)}</p>
            <p className="mt-1">Empty fields fall back to the site&apos;s built-in text. Customer reviews and the product/category/brand lists are managed in their own sections.</p>
          </CardBody>
        </Card>
      </div>

      <div className="sticky bottom-0 z-10 -mx-4 mt-6 flex items-center justify-end gap-2 border-t border-border bg-surface px-4 py-4 shadow-md md:-mx-8 md:px-8">
        <Button
          type="button"
          variant="ghost"
          onClick={() => {
            if (confirmDiscard()) reset(initialValues);
          }}
        >
          Cancel
        </Button>
        <Button type="button" onClick={onSubmit} loading={save.isPending}>
          Save
        </Button>
      </div>
    </form>
  );
}
