import { lazy, LazyExoticComponent } from 'react';

export interface RouteMetadata {
  path: string;
  label: string;
  permission?: string;
  element: LazyExoticComponent<any>;
  layout?: 'dashboard' | 'auth' | 'none';
  children?: RouteMetadata[];
}

const Dashboard = lazy(() => import('@/pages/Dashboard'));

export const privateRoutes: RouteMetadata[] = [
  {
    path: '/dashboard',
    label: 'Dashboard',
    element: Dashboard,
    layout: 'dashboard',
  },
];
