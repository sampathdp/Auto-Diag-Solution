import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface StatCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  trend?: {
    value: number;
    isUp: boolean;
  };
  color?: "indigo" | "blue" | "emerald" | "amber" | "rose" | "slate";
  className?: string;
  href?: string;
}

const colorMap = {
  indigo: "bg-indigo-50 text-indigo-600",
  blue: "bg-blue-50 text-blue-600",
  emerald: "bg-emerald-50 text-emerald-600",
  amber: "bg-amber-50 text-amber-600",
  rose: "bg-rose-50 text-rose-600",
  slate: "bg-slate-50 text-slate-600",
};

import { Link } from "react-router-dom";

export const StatCard = ({ title, value, icon: Icon, trend, color = "indigo", className, href }: StatCardProps) => {
  const content = (
    <>
      <div className="flex items-center justify-between mb-4">
        <div className={cn("p-2 rounded-lg", colorMap[color])}>
          <Icon size={24} />
        </div>
        {trend && (
          <span className={cn(
            "text-xs font-bold px-2 py-1 rounded-full",
            trend.isUp ? "bg-emerald-50 text-emerald-600" : "bg-rose-50 text-rose-600"
          )}>
            {trend.isUp ? "+" : "-"}{trend.value}%
          </span>
        )}
      </div>
      <div>
        <p className="text-sm font-medium text-slate-500">{title}</p>
        <h3 className="text-2xl font-bold text-slate-900 mt-1">{value}</h3>
      </div>
    </>
  );

  if (href) {
    return (
      <Link 
        to={href} 
        className={cn(
          "bg-white p-6 rounded-xl border border-slate-200 shadow-sm hover:border-indigo-300 hover:shadow-md transition-all block group", 
          className
        )}
      >
        {content}
      </Link>
    );
  }

  return (
    <div className={cn("bg-white p-6 rounded-xl border border-slate-200 shadow-sm", className)}>
      {content}
    </div>
  );
};
