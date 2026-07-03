import { Menu } from "lucide-react";
import { useAuthStore } from "@/store/useAuthStore";

export const Navbar = ({ onMenuClick }: { onMenuClick: () => void }) => {
  const user = useAuthStore((state) => state.user);

  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-10">
      <div className="h-14 px-4 md:px-6 flex items-center justify-between">
        <button
          onClick={onMenuClick}
          className="lg:hidden p-2 -ml-2 text-slate-600 hover:bg-slate-50 rounded-lg"
        >
          <Menu size={20} />
        </button>

        <div className="flex items-center space-x-2 ml-auto">
          <div className="w-8 h-8 bg-indigo-100 text-indigo-600 rounded-lg flex items-center justify-center font-bold text-xs">
            {user?.name?.[0] || "U"}
          </div>
          <div className="hidden sm:block text-left">
            <p className="text-xs font-bold text-slate-900 leading-none">{user?.name}</p>
            <p className="text-[10px] text-slate-500 mt-1 uppercase tracking-wider">{user?.role}</p>
          </div>
        </div>
      </div>
    </header>
  );
};
