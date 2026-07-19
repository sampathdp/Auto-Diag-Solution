import { AnnouncementBar } from "@/components/layout/AnnouncementBar";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { WhatsAppBubble } from "@/components/layout/WhatsAppBubble";
import { CartFloatingButton } from "@/components/layout/CartFloatingButton";
import { GlobalStateInitializer } from "@/components/storefront/providers/GlobalStateInitializer";
import { CommandPalette } from "@/components/account/CommandPalette";
import { ShortcutsModal } from "@/components/account/ShortcutsModal";
import { ActiveVehicleBanner } from "@/components/shop/ActiveVehicleBanner";

export default function StorefrontLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <AnnouncementBar />
      <SiteHeader />
      <ActiveVehicleBanner />
      <GlobalStateInitializer />
      {children}
      <SiteFooter />
      <WhatsAppBubble />
      <CartFloatingButton />
      <CommandPalette />
      <ShortcutsModal />
    </>
  );
}
