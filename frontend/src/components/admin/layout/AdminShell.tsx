import { SidebarProvider } from "./SidebarContext";
import { Sidebar } from "./Sidebar";
import { MobileSidebarDrawer } from "./MobileSidebarDrawer";
import { Topbar } from "./Topbar";

export function AdminShell({ children }: { children: React.ReactNode }) {
  return (
    <SidebarProvider>
      <div className="flex min-h-screen bg-app">
        <Sidebar />
        <MobileSidebarDrawer />
        <div className="flex min-h-screen min-w-0 flex-1 flex-col overflow-x-clip">
          <Topbar />
          <main className="flex-1 overflow-x-clip px-4 py-6 md:px-8 md:py-8">{children}</main>
        </div>
      </div>
    </SidebarProvider>
  );
}
