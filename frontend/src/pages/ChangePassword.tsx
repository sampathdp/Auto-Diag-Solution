import { useState } from "react";
import { useForm } from "react-hook-form";
import { useAuthStore } from "@/store/useAuthStore";
import apiClient from "@/api/client";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Eye, EyeOff, Loader2, Lock, ShieldCheck, LogOut } from "lucide-react";
import SEO from "@/components/SEO";

interface ChangePasswordForm {
  current_password: string;
  new_password: string;
  confirm_new_password: string;
}

const ChangePassword = () => {
  const navigate = useNavigate();
  const { user, setAuth, logout } = useAuthStore();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const { register, handleSubmit, watch, formState: { errors } } = useForm<ChangePasswordForm>({
    defaultValues: {
      current_password: "",
      new_password: "",
      confirm_new_password: "",
    }
  });

  const newPasswordVal = watch("new_password");

  const onSubmit = async (values: ChangePasswordForm) => {
    setLoading(true);
    setError(null);
    try {
      const response = await apiClient.post("/auth/change-password", {
        current_password: values.current_password,
        new_password: values.new_password
      });

      const { user: updatedUser, permissions } = response.data.data;

      setAuth(updatedUser, permissions || []);
      
      // Navigate to correct dashboard based on role
      const target = updatedUser.role === "super_admin" ? "/admin/dashboard" : "/dashboard";
      navigate(target);
    } catch (err: any) {
      setError(err.response?.data?.message || "Failed to update password. Please check your credentials.");
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  // Determine password strength
  const getPasswordStrength = (pwd: string) => {
    if (!pwd) return { score: 0, text: "", color: "bg-slate-200" };
    let score = 0;
    if (pwd.length >= 6) score++;
    if (/[A-Z]/.test(pwd)) score++;
    if (/[0-9]/.test(pwd)) score++;
    if (/[^A-Za-z0-9]/.test(pwd)) score++;
    
    switch (score) {
      case 1: return { score, text: "Weak", color: "bg-rose-500 w-1/4" };
      case 2: return { score, text: "Fair", color: "bg-amber-500 w-2/4" };
      case 3: return { score, text: "Good", color: "bg-indigo-500 w-3/4" };
      case 4: return { score, text: "Strong", color: "bg-emerald-500 w-full" };
      default: return { score: 0, text: "", color: "bg-slate-200" };
    }
  };

  const strength = getPasswordStrength(newPasswordVal);

  return (
    <>
      <SEO 
        title="Reset Password - SalonFlow"
        description="Change your temporary password to secure your account."
      />
      <div className="min-h-screen w-full flex items-center justify-center bg-slate-950 relative overflow-hidden font-sans p-4 sm:p-6">
        {/* Abstract Background Accents */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-indigo-950/40 via-slate-950 to-black"></div>
        <div className="absolute top-1/4 left-1/4 w-[350px] h-[350px] bg-indigo-500/10 rounded-full blur-3xl"></div>
        <div className="absolute bottom-1/4 right-1/4 w-[350px] h-[350px] bg-cyan-500/10 rounded-full blur-3xl"></div>

        <motion.div 
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          className="relative z-10 w-full max-w-md bg-white/5 border border-white/10 rounded-3xl p-6 sm:p-8 backdrop-blur-md shadow-2xl"
        >
          {/* Header */}
          <div className="text-center mb-8">
            <div className="w-16 h-16 mx-auto mb-5 rounded-2xl bg-gradient-to-tr from-indigo-500 to-cyan-500 flex items-center justify-center text-white shadow-lg">
              <Lock className="w-8 h-8" />
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight mb-2">
              Set your password
            </h2>
            <p className="text-slate-400 text-sm leading-relaxed max-w-xs mx-auto">
              Hi, <span className="text-indigo-400 font-bold">{user?.name}</span>. For your security, you must replace your temporary password before proceeding.
            </p>
          </div>

          {error && (
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="mb-6 p-4 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-400 flex items-start gap-3 text-sm"
            >
              <div className="mt-0.5">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
              </div>
              <p className="font-semibold leading-relaxed">{error}</p>
            </motion.div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            {/* Current Password */}
            <div>
              <label className="block text-xs font-black text-slate-400 uppercase tracking-wider mb-2">
                Temporary / Current Password
              </label>
              <div className="relative">
                <input
                  {...register("current_password", { required: "Temporary password is required" })}
                  type={showCurrent ? "text" : "password"}
                  placeholder="Enter temporary password"
                  className={`w-full px-4 py-3.5 pr-11 rounded-xl bg-white/5 border ${errors.current_password ? 'border-red-500 focus:ring-red-500/20' : 'border-white/10 focus:border-indigo-500 focus:ring-indigo-500/20'} text-white placeholder:text-slate-500 focus:outline-none focus:ring-4 transition-all duration-200`}
                />
                <button
                  type="button"
                  onClick={() => setShowCurrent(!showCurrent)}
                  className="absolute right-3.5 top-3.5 text-slate-400 hover:text-white transition-colors"
                >
                  {showCurrent ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              {errors.current_password && (
                <p className="text-red-400 text-xs font-bold mt-1.5">{errors.current_password.message}</p>
              )}
            </div>

            {/* New Password */}
            <div>
              <label className="block text-xs font-black text-slate-400 uppercase tracking-wider mb-2">
                New Password
              </label>
              <div className="relative">
                <input
                  {...register("new_password", {
                    required: "New password is required",
                    minLength: { value: 6, message: "Password must be at least 6 characters" }
                  })}
                  type={showNew ? "text" : "password"}
                  placeholder="Create a new password"
                  className={`w-full px-4 py-3.5 pr-11 rounded-xl bg-white/5 border ${errors.new_password ? 'border-red-500 focus:ring-red-500/20' : 'border-white/10 focus:border-indigo-500 focus:ring-indigo-500/20'} text-white placeholder:text-slate-500 focus:outline-none focus:ring-4 transition-all duration-200`}
                />
                <button
                  type="button"
                  onClick={() => setShowNew(!showNew)}
                  className="absolute right-3.5 top-3.5 text-slate-400 hover:text-white transition-colors"
                >
                  {showNew ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              {errors.new_password && (
                <p className="text-red-400 text-xs font-bold mt-1.5">{errors.new_password.message}</p>
              )}

              {/* Password strength meter */}
              {newPasswordVal && (
                <div className="mt-3">
                  <div className="flex items-center justify-between text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1">
                    <span>Password Strength</span>
                    <span className="text-indigo-400">{strength.text}</span>
                  </div>
                  <div className="w-full bg-white/10 h-1.5 rounded-full overflow-hidden">
                    <div className={`h-full ${strength.color} transition-all duration-300`}></div>
                  </div>
                </div>
              )}
            </div>

            {/* Confirm New Password */}
            <div>
              <label className="block text-xs font-black text-slate-400 uppercase tracking-wider mb-2">
                Confirm New Password
              </label>
              <div className="relative">
                <input
                  {...register("confirm_new_password", {
                    required: "Please confirm your new password",
                    validate: (value) => value === newPasswordVal || "Passwords do not match"
                  })}
                  type={showConfirm ? "text" : "password"}
                  placeholder="Re-enter your new password"
                  className={`w-full px-4 py-3.5 pr-11 rounded-xl bg-white/5 border ${errors.confirm_new_password ? 'border-red-500 focus:ring-red-500/20' : 'border-white/10 focus:border-indigo-500 focus:ring-indigo-500/20'} text-white placeholder:text-slate-500 focus:outline-none focus:ring-4 transition-all duration-200`}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirm(!showConfirm)}
                  className="absolute right-3.5 top-3.5 text-slate-400 hover:text-white transition-colors"
                >
                  {showConfirm ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              {errors.confirm_new_password && (
                <p className="text-red-400 text-xs font-bold mt-1.5">{errors.confirm_new_password.message}</p>
              )}
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full h-12 mt-4 bg-gradient-to-r from-indigo-600 to-cyan-600 hover:from-indigo-500 hover:to-cyan-500 text-white font-bold rounded-xl shadow-lg hover:shadow-indigo-500/20 transition-all duration-200 disabled:opacity-70 flex items-center justify-center gap-2"
            >
              {loading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  <ShieldCheck size={18} />
                  Update & Continue
                </>
              )}
            </button>
          </form>

          {/* Fallback Sign Out */}
          <div className="mt-8 pt-6 border-t border-white/10 text-center">
            <button
              onClick={handleLogout}
              className="inline-flex items-center gap-2 text-xs font-bold text-slate-400 hover:text-white transition-colors"
            >
              <LogOut size={14} />
              Sign out and return to Login
            </button>
          </div>
        </motion.div>
      </div>
    </>
  );
};

export default ChangePassword;
