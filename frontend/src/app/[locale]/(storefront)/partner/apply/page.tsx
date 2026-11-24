import { getTranslations } from "next-intl/server";
import { DealerApplicationForm } from "@/components/partner/DealerApplicationForm";

export async function generateMetadata() {
  const t = await getTranslations("partner.apply");
  return { title: t("title"), robots: { index: false } };
}

export default function DealerApplyPage() {
  return <DealerApplicationForm />;
}
