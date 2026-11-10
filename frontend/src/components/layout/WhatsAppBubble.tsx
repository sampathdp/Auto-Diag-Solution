import { getLocale } from "next-intl/server";
import { WhatsAppIcon } from "@/components/icons/WhatsAppIcon";
import { getContactInfo } from "@/lib/site-info";
import { buildWhatsAppUrl } from "@/lib/whatsapp";

export async function WhatsAppBubble() {
  const locale = await getLocale();
  const contact = await getContactInfo(locale, {
    address: "",
    phone: "",
    email: "",
    hours: "",
    whatsapp: "",
  });

  const fitmentMessage =
    locale === "ar"
      ? "مرحبا، أحتاج إلى مساعدة في التحقق من توافق قطع الغيار لسيارتي."
      : "Hi, I need help checking part fitment for my car.";

  const href = buildWhatsAppUrl(contact.whatsapp, fitmentMessage);

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Chat on WhatsApp"
      className="fixed bottom-6 end-6 z-[70] flex h-14 w-14 items-center justify-center rounded-full bg-[#25D366] text-white shadow-lifted transition-transform hover:scale-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#25D366] focus-visible:ring-offset-2"
    >
      <WhatsAppIcon className="h-7 w-7" />
    </a>
  );
}
