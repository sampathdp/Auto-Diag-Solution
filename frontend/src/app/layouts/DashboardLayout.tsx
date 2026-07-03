import { useState, useEffect } from "react";
import { Outlet } from "react-router-dom";
import { Sidebar } from "@/components/sidebar/Sidebar";
import { Navbar } from "@/components/navbar/Navbar";
import { PaymentBlockModal } from "@/components/booking/PaymentBlockModal";
import apiClient from "@/api/client";
import { useAuthStore } from "@/store/useAuthStore";

export const DashboardLayout = () => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isBlocked, setIsBlocked] = useState(false);
  const [isPending, setIsPending] = useState(false);
  const updateUser = useAuthStore(state => state.updateUser);

  useEffect(() => {
    // Sync latest user details from server (e.g. after subscription upgrades)
    apiClient.get('/auth/me')
      .then(res => {
        if (res.data?.data?.user) {
          updateUser(res.data.data.user);
        }
      })
      .catch(() => {});
  }, [updateUser]);

  useEffect(() => {
    const handleBlock = () => setIsBlocked(true);
    const handlePending = () => {
      setIsBlocked(true);
      setIsPending(true);
    };

    window.addEventListener('subscriptionExpired', handleBlock);
    window.addEventListener('paymentPending', handlePending);
    
    return () => {
      window.removeEventListener('subscriptionExpired', handleBlock);
      window.removeEventListener('paymentPending', handlePending);
    };
  }, []);

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden">
      <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />
      
      <div className="flex flex-col flex-1 overflow-hidden relative">
        <Navbar onMenuClick={() => setIsSidebarOpen(true)} />
        
        <main className="flex-1 overflow-y-auto p-4 md:p-8">
          <Outlet />
        </main>

        {/* Mobile Overlay */}
        {isSidebarOpen && (
          <div 
            className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-20 lg:hidden"
            onClick={() => setIsSidebarOpen(false)}
          />
        )}
      </div>
      
      {/* Block Access Modal */}
      {isBlocked && <PaymentBlockModal initialPending={isPending} />}
    </div>
  );
};
