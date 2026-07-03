import { useAuthStore } from "@/store/useAuthStore";
import SEO from "@/components/SEO";

const Dashboard = () => {
  const user = useAuthStore((state) => state.user);

  return (
    <>
      <SEO title="Dashboard" description="Account dashboard." />
      <div>
        <h1 className="text-2xl font-bold text-slate-900 mb-2">Dashboard</h1>
        <p className="text-slate-500">Welcome back{user?.name ? `, ${user.name}` : ""}.</p>
      </div>
    </>
  );
};

export default Dashboard;
