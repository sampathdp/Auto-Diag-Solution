"use client";

import { AuthGuard } from "@/components/account/AuthGuard";
import { Link, usePathname, useRouter } from "@/i18n/navigation";
import { User, Car, MapPin, Package, Heart, Bell, LogOut, LayoutDashboard } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/store/useAuthStore";
import { useTranslations } from "next-intl";

export default function AccountLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const t = useTranslations("account.nav");
  const { user, logout } = useAuthStore();
  const firstName = user?.name?.split(" ")[0] || "there";
  const initial = user?.name?.charAt(0).toUpperCase() || "?";

  const handleLogout = () => {
    logout();
    router.push("/");
  };

  const navItems = [
    { label: t("overview"), href: "/account/overview", icon: LayoutDashboard },
    { label: t("orders"), href: "/account/orders", icon: Package },
    { label: t("vehicles"), href: "/account/vehicles", icon: Car },
    { label: t("wishlist"), href: "/account/wishlist", icon: Heart },
    { label: t("profile"), href: "/account/profile", icon: User },
    { label: t("addresses"), href: "/account/addresses", icon: MapPin },
    { label: t("alerts"), href: "/account/notifications", icon: Bell },
  ];

  // For bottom tab, we usually pick the 4 or 5 most important ones.
  const bottomTabItems = navItems.slice(0, 5);

  return (
    <AuthGuard>
      <div className="container mx-auto flex flex-col md:flex-row gap-8 px-4 py-8 md:py-12 mb-20 md:mb-0">
        {/* Desktop Sidebar */}
        <aside className="hidden md:flex w-64 flex-col gap-6 sticky top-24 h-[calc(100vh-6rem)]">
          <div className="rounded-xl border bg-card p-5 shadow-sm flex items-center gap-4">
            <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-lg">
              {initial}
            </div>
            <div>
              <p className="font-medium text-sm text-muted-foreground">{t("welcomeBack")}</p>
              <h3 className="font-bold text-foreground">{firstName}</h3>
            </div>
          </div>

          <nav className="flex flex-col gap-1">
            {navItems.map((item) => {
              const isActive = pathname.includes(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href as any}
                  className={cn(
                    "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                    isActive
                      ? "bg-primary/10 text-primary"
                      : "text-muted-foreground hover:bg-primary/5 hover:text-primary"
                  )}
                >
                  <item.icon className="h-4 w-4" />
                  {item.label}
                </Link>
              );
            })}
            <hr className="my-2 border-border" />
            <button onClick={handleLogout} className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-destructive hover:bg-destructive/10 transition-colors">
              <LogOut className="h-4 w-4" />
              {t("logout")}
            </button>
          </nav>
        </aside>

        {/* Mobile Navigation (Horizontal Scroll - Tablets) */}
        <div className="hidden sm:flex md:hidden overflow-x-auto pb-2 -mx-4 px-4 snap-x border-b mb-4">
          {navItems.map((item) => {
            const isActive = pathname.includes(item.href);
            return (
              <Link
                key={item.href}
                href={item.href as any}
                className={cn(
                  "flex whitespace-nowrap snap-start items-center gap-2 border-b-2 px-4 py-3 text-sm font-medium transition-colors",
                  isActive
                    ? "border-primary text-primary"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                )}
              >
                <item.icon className="h-4 w-4" />
                {item.label}
              </Link>
            );
          })}
        </div>

        {/* Mobile Bottom Tab Bar (Phones) */}
        <div className="sm:hidden fixed bottom-0 left-0 right-0 z-50 flex items-center justify-between border-t bg-background px-2 pb-[env(safe-area-inset-bottom)] pt-2 shadow-[0_-4px_10px_rgba(0,0,0,0.05)]">
          {bottomTabItems.map((item) => {
            const isActive = pathname.includes(item.href);
            return (
              <Link
                key={item.href}
                href={item.href as any}
                className={cn(
                  "flex flex-col items-center justify-center w-full py-1 gap-1 text-[10px] font-medium transition-colors",
                  isActive ? "text-primary" : "text-muted-foreground hover:text-foreground"
                )}
              >
                <item.icon className={cn("h-5 w-5", isActive ? "fill-primary/20" : "")} />
                {item.label}
              </Link>
            );
          })}
        </div>

        {/* Main Content */}
        <main className="flex-1 min-w-0">
          {children}
        </main>
      </div>
    </AuthGuard>
  );
}
