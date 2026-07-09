import { WhatsAppIcon } from "@/components/icons/WhatsAppIcon";

const WHATSAPP_NUMBER = "971501234567";

export function WhatsAppBubble() {
  return (
    <a
      href={`https://wa.me/${WHATSAPP_NUMBER}`}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Chat on WhatsApp"
      className="fixed bottom-6 end-6 z-[70] flex h-14 w-14 items-center justify-center rounded-full bg-[#25D366] text-white shadow-lifted transition-transform hover:scale-105"
    >
      <WhatsAppIcon className="h-7 w-7" />
    </a>
  );
}
