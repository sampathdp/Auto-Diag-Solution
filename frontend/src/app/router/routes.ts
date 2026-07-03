import { lazy, LazyExoticComponent } from 'react';

export interface RouteMetadata {
  path: string;
  label: string;
  permission?: string;
  element: LazyExoticComponent<any>;
  layout?: 'dashboard' | 'auth' | 'none';
  children?: RouteMetadata[];
}

// Lazy Load Pages
const Dashboard = lazy(() => import('@/pages/Dashboard'));
const Appointments = lazy(() => import('@/pages/Appointments'));
const Jobs = lazy(() => import('@/pages/Jobs'));
const Customers = lazy(() => import('@/pages/Customers'));
const Services = lazy(() => import('@/pages/Services'));
const Billing = lazy(() => import('@/pages/Billing'));
const Settings = lazy(() => import('@/pages/Settings'));
const Users = lazy(() => import('@/pages/Users'));
const Salons = lazy(() => import('@/pages/Salons'));
const AdminDashboard = lazy(() => import('@/pages/AdminDashboard'));
const TrialRequests = lazy(() => import('@/pages/TrialRequests'));
const ContactMessages = lazy(() => import('@/pages/ContactMessages'));
const Packages = lazy(() => import('@/pages/Packages'));
const PromoCodes = lazy(() => import('@/pages/PromoCodes'));
const AdminPayments = lazy(() => import('@/pages/AdminPayments'));
const AdminSystemSettings = lazy(() => import('@/pages/AdminSystemSettings'));
const AdminInvoices = lazy(() => import('@/pages/AdminInvoices'));
const Staff = lazy(() => import('@/pages/Staff'));
const InventoryPage = lazy(() => import('@/pages/Inventory'));
const NewSale = lazy(() => import('@/pages/NewSale'));
const PaymentVerification = lazy(() => import('@/pages/PaymentVerification'));
const Reports = lazy(() => import('@/pages/Reports'));
const Expenses = lazy(() => import('@/pages/Expenses'));

export const privateRoutes: RouteMetadata[] = [
  {
    path: '/admin/dashboard',
    label: 'Admin Dashboard',
    permission: 'admin.manage',
    element: AdminDashboard,
    layout: 'dashboard',
  },
  {
    path: '/admin/trials',
    label: 'Trial Requests',
    permission: 'admin.manage',
    element: TrialRequests,
    layout: 'dashboard',
  },
  {
    path: '/admin/messages',
    label: 'Contact Messages',
    permission: 'admin.manage',
    element: ContactMessages,
    layout: 'dashboard',
  },
  {
    path: '/admin/packages',
    label: 'Packages',
    permission: 'admin.manage',
    element: Packages,
    layout: 'dashboard',
  },
  {
    path: '/admin/promo-codes',
    label: 'Promo Codes',
    permission: 'admin.manage',
    element: PromoCodes,
    layout: 'dashboard',
  },
  {
    path: '/admin/payments',
    label: 'Salon Payments',
    permission: 'admin.manage',
    element: AdminPayments,
    layout: 'dashboard',
  },
  {
    path: '/admin/system-settings',
    label: 'System Settings',
    permission: 'admin.manage',
    element: AdminSystemSettings,
    layout: 'dashboard',
  },
  {
    path: '/admin/invoices',
    label: 'Salon Invoices',
    permission: 'admin.manage',
    element: AdminInvoices,
    layout: 'dashboard',
  },
  {
    path: '/dashboard',
    label: 'Dashboard',
    element: Dashboard,
    layout: 'dashboard',
  },
  {
    path: '/salons',
    label: 'Salons',
    permission: 'salons.view',
    element: Salons,
    layout: 'dashboard',
  },
  {
    path: '/users',
    label: 'Users',
    permission: 'users.view',
    element: Users,
    layout: 'dashboard',
  },
  {
    path: '/staff',
    label: 'Staff',
    permission: 'staff.view',
    element: Staff,
    layout: 'dashboard',
  },
  {
    path: '/appointments',
    label: 'Appointments',
    permission: 'appointments.view',
    element: Appointments,
    layout: 'dashboard',
  },
  {
    path: '/jobs',
    label: 'Jobs',
    permission: 'appointments.view',
    element: Jobs,
    layout: 'dashboard',
  },
  {
    path: '/customers',
    label: 'Customers',
    permission: 'customers.view',
    element: Customers,
    layout: 'dashboard',
  },
  {
    path: '/services',
    label: 'Services',
    permission: 'services.view',
    element: Services,
    layout: 'dashboard',
  },
  {
    path: '/billing/new-sale',
    label: 'New Sale',
    permission: 'billing.view',
    element: NewSale,
    layout: 'dashboard',
  },
  {
    path: '/inventory',
    label: 'Inventory',
    permission: 'inventory.view',
    element: InventoryPage,
    layout: 'dashboard',
  },
  {
    path: '/billing',
    label: 'Billing',
    permission: 'billing.view',
    element: Billing,
    layout: 'dashboard',
  },
  {
    path: '/payments/verify',
    label: 'Verify Payments',
    permission: 'billing.accept_payment',
    element: PaymentVerification,
    layout: 'dashboard',
  },
  {
    path: '/settings',
    label: 'Settings',
    permission: 'settings.view',
    element: Settings,
    layout: 'dashboard',
  },
  {
    path: '/expenses',
    label: 'Expenses',
    permission: 'billing.view',
    element: Expenses,
    layout: 'dashboard',
  },
  {
    path: '/reports',
    label: 'Reports',
    permission: 'reports.view',
    element: Reports,
    layout: 'dashboard',
  }
];
