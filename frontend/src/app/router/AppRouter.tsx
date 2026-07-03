import { Routes, Route, Navigate } from "react-router-dom";
import { useAuthStore } from "@/store/useAuthStore";
import { DashboardLayout } from "../layouts/DashboardLayout";
import { lazy, Suspense } from "react";
import { privateRoutes } from "./routes";
import { usePermissions } from "@/hooks/usePermissions";
import Preloader from "@/components/ui/Preloader";

const Login = lazy(() => import("@/pages/Login"));
const Landing = lazy(() => import("@/pages/Landing"));
const StartTrial = lazy(() => import("@/pages/StartTrial"));
const PublicBooking = lazy(() => import("@/pages/PublicBooking"));
const ChangePassword = lazy(() => import("@/pages/ChangePassword"));
const PrivacyPolicy = lazy(() => import("@/pages/PrivacyPolicy"));

const ProtectedRoute = ({ children, permission }: { children: React.ReactNode, permission?: string }) => {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const user = useAuthStore((state) => state.user);
  const { can } = usePermissions();

  if (!isAuthenticated) return <Navigate to="/login" />;
  if (user?.needs_password_change) {
    return <Navigate to="/change-password" replace />;
  }
  if (permission && !can(permission)) return <Navigate to="/dashboard" replace />;

  return <>{children}</>;
};

const GuestRoute = ({ children }: { children: React.ReactNode }) => {
  const { isAuthenticated, user } = useAuthStore();
  
  if (isAuthenticated) {
    if (user?.needs_password_change) {
      return <Navigate to="/change-password" replace />;
    }
    return user?.role === 'super_admin' 
      ? <Navigate to="/admin/dashboard" /> 
      : <Navigate to="/dashboard" />;
  }

  return <>{children}</>;
};

const ForceChangePasswordRoute = ({ children }: { children: React.ReactNode }) => {
  const { isAuthenticated, user } = useAuthStore();

  if (!isAuthenticated) return <Navigate to="/login" />;
  if (!user?.needs_password_change) {
    return user?.role === 'super_admin' 
      ? <Navigate to="/admin/dashboard" replace /> 
      : <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
};

export const AppRouter = () => {
  return (
    <Suspense fallback={<Preloader />}>
      <Routes>
        {/* Public Routes */}
        <Route path="/" element={<Landing />} />
        <Route path="/start-trial" element={<StartTrial />} />
        <Route path="/privacy-policy" element={<PrivacyPolicy />} />
        <Route path="/login" element={<GuestRoute><Login /></GuestRoute>} />
        <Route path="/s/:slug" element={<PublicBooking />} />
        
        {/* Password change force route */}
        <Route path="/change-password" element={<ForceChangePasswordRoute><ChangePassword /></ForceChangePasswordRoute>} />
        
        {/* Dynamic Private Routes */}
        <Route element={<DashboardLayout />}>
          {privateRoutes.map((route) => (
            <Route
              key={route.path}
              path={route.path}
              element={
                <ProtectedRoute permission={route.permission}>
                  <route.element />
                </ProtectedRoute>
              }
            />
          ))}
        </Route>
        
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </Suspense>
  );
};
