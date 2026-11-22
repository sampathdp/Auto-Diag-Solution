import type { LucideIcon } from "lucide-react";
import {
  LayoutDashboard,
  Package,
  FolderTree,
  Tag,
  Car,
  ShoppingCart,
  Users,
  FileText,
  Search,
  ImageIcon,
  Settings,
  BarChart3,
  Truck,
  Percent,
  UserCheck,
  Wallet,
  ShieldCheck,
  Mail,
  Handshake,
  ClipboardList,
  Store,
} from "lucide-react";

export interface NavLeaf {
  label: string;
  href: string;
  icon: LucideIcon;
  /** Hidden unless the admin holds this permission (the API enforces it regardless). */
  permission?: string;
}

export interface NavGroup {
  label: string;
  icon: LucideIcon;
  children: NavLeaf[];
}

export type NavEntry = NavLeaf | NavGroup;

export function isNavGroup(entry: NavEntry): entry is NavGroup {
  return "children" in entry;
}

export const NAV_ITEMS: NavEntry[] = [
  { label: "Dashboard", href: "/admin/dashboard", icon: LayoutDashboard },
  { label: "Products", href: "/admin/products", icon: Package },
  { label: "Categories", href: "/admin/categories", icon: FolderTree },
  { label: "Brands", href: "/admin/brands", icon: Tag },
  { label: "Vehicles", href: "/admin/vehicles", icon: Car },
  { label: "Shipping", href: "/admin/shipping", icon: Truck },
  { label: "Orders", href: "/admin/orders", icon: ShoppingCart },
  { label: "Customers", href: "/admin/customers", icon: Users },
  {
    label: "B2B Dealers",
    icon: Handshake,
    children: [
      { label: "Dealer Applications", href: "/admin/b2b/applications", icon: ClipboardList, permission: "b2b.applications.view" },
      { label: "Approved Dealers", href: "/admin/b2b/dealers", icon: Store, permission: "b2b.applications.view" },
    ],
  },
  {
    label: "Content",
    icon: FileText,
    children: [
      { label: "Home Page", href: "/admin/content/home", icon: FileText },
      { label: "About Us Page", href: "/admin/content/about", icon: FileText },
      { label: "Pages", href: "/admin/content/pages", icon: FileText },
      { label: "SEO", href: "/admin/content/seo", icon: Search },
    ],
  },
  {
    label: "Marketing",
    icon: Percent,
    children: [
      { label: "Promo Codes", href: "/admin/marketing/promo-codes", icon: Percent },
      { label: "Sales Representatives", href: "/admin/marketing/sales-representatives", icon: UserCheck },
      { label: "Commissions", href: "/admin/marketing/commissions", icon: Wallet },
    ],
  },
  { label: "Media", href: "/admin/media", icon: ImageIcon },
  { label: "Reports", href: "/admin/reports", icon: BarChart3 },
  {
    label: "Settings",
    icon: Settings,
    children: [
      { label: "Store Settings", href: "/admin/settings", icon: Settings },
      { label: "Staff & Permissions", href: "/admin/staff", icon: ShieldCheck, permission: "staff.manage" },
      { label: "Email Log", href: "/admin/email-log", icon: Mail },
    ],
  },
];
