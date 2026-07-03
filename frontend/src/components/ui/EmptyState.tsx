import { LucideIcon, Ghost } from "lucide-react";

interface EmptyStateProps {
  title: string;
  description: string;
  icon?: LucideIcon;
  action?: React.ReactNode;
}

export const EmptyState = ({ title, description, icon: Icon = Ghost, action }: EmptyStateProps) => {
  return (
    <div className="flex flex-col items-center justify-center py-12 px-4 text-center bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200">
      <div className="p-4 bg-white rounded-full shadow-sm mb-4">
        <Icon size={40} className="text-slate-300" />
      </div>
      <h3 className="text-lg font-bold text-slate-900">{title}</h3>
      <p className="text-slate-500 mt-1 max-w-xs">{description}</p>
      {action && <div className="mt-6">{action}</div>}
    </div>
  );
};
