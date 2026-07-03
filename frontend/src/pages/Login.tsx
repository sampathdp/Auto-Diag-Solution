import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { LoginSchema, LoginFormValues } from "@/schemas/LoginSchema";
import { useAuthStore } from "@/store/useAuthStore";
import apiClient from "@/api/client";
import { useNavigate, Link } from "react-router-dom";
import { useState, FormEvent } from "react";
import { ArrowLeft, Loader2 } from "lucide-react";
import { motion } from "framer-motion";
import SEO from "@/components/SEO";

const LoginPage = () => {
  const navigate = useNavigate();
  const setAuth = useAuthStore((state) => state.setAuth);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const [pendingCredentials, setPendingCredentials] = useState<LoginFormValues | null>(null);
  const [totpCode, setTotpCode] = useState("");

  const { register, handleSubmit, formState: { errors } } = useForm<LoginFormValues>({
    resolver: zodResolver(LoginSchema),
  });

  const completeLogin = (data: any) => {
    const { user, permissions } = data.data;

    setAuth(user, permissions || []);

    if (user.needs_password_change) {
      navigate('/change-password');
    } else {
      navigate('/dashboard');
    }
  };

  const onSubmit = async (values: LoginFormValues) => {
    setLoading(true);
    setError(null);
    try {
      const { data } = await apiClient.post('/auth/login', values);
      completeLogin(data);
    } catch (err: any) {
      if (err.response?.data?.message === '2FA_REQUIRED') {
        setPendingCredentials(values);
        setTotpCode("");
      } else {
        setError(err.response?.data?.message || "Invalid email or password");
      }
    } finally {
      setLoading(false);
    }
  };

  const onSubmitTotp = async (e: FormEvent) => {
    e.preventDefault();
    if (!pendingCredentials) return;

    setLoading(true);
    setError(null);
    try {
      const { data } = await apiClient.post('/auth/login', {
        ...pendingCredentials,
        totp_code: totpCode.trim(),
      });
      completeLogin(data);
    } catch (err: any) {
      setError(err.response?.data?.message || "Invalid verification code");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <SEO
        title="Login"
        description="Access your account dashboard."
      />
      <div className="min-h-screen flex w-full bg-white font-sans">
      {/* Left side: Brand / Visual (Hidden on mobile) */}
      <div className="hidden lg:flex w-1/2 relative bg-slate-900 overflow-hidden items-center justify-center p-12">
        {/* Background gradient effects */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,_var(--tw-gradient-stops))] from-indigo-900/40 via-slate-900 to-black"></div>
        <div className="absolute -top-32 -left-32 w-96 h-96 bg-indigo-500/20 rounded-full blur-3xl"></div>
        <div className="absolute bottom-0 right-0 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl"></div>
        
        <div className="relative z-10 w-full max-w-lg">
          <Link to="/" className="flex justify-center mb-16 hover:opacity-80 transition-opacity">
            <span className="text-3xl font-bold text-white">Storefront</span>
          </Link>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <h1 className="text-4xl lg:text-5xl font-bold text-white leading-tight mb-6 tracking-tight">
              Welcome to <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-cyan-400">your account.</span>
            </h1>
            <p className="text-slate-400 text-lg leading-relaxed mb-12 max-w-md">
              Sign in to manage your account and orders.
            </p>
          </motion.div>
        </div>
      </div>

      {/* Right side: Login Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-6 sm:p-12 lg:p-24 bg-white relative">
        <Link to="/" className="absolute top-8 left-8 flex items-center gap-2 text-sm text-slate-500 hover:text-slate-900 transition-colors lg:hidden">
          <ArrowLeft size={16} /> Back
        </Link>
        
        <div className="w-full max-w-md">
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.4 }}
          >
            {/* Mobile Header Logo */}
            <div className="lg:hidden flex justify-center mb-10">
              <span className="text-2xl font-bold text-slate-900">Storefront</span>
            </div>

            <div className="mb-10">
              <h2 className="text-3xl font-bold text-slate-900 tracking-tight mb-2">
                {pendingCredentials ? "Two-factor verification" : "Welcome back"}
              </h2>
              <p className="text-slate-500">
                {pendingCredentials
                  ? "Enter the 6-digit code from your authenticator app, or a recovery code."
                  : "Please enter your details to sign in."}
              </p>
            </div>

            {error && (
              <div className="mb-6 p-4 rounded-xl bg-red-50 border border-red-100 flex items-start gap-3 text-red-600">
                <div className="mt-0.5">
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                </div>
                <p className="text-sm font-medium">{error}</p>
              </div>
            )}

            {pendingCredentials ? (
              <form onSubmit={onSubmitTotp} className="space-y-5">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">Verification code</label>
                  <input
                    value={totpCode}
                    onChange={(e) => setTotpCode(e.target.value)}
                    autoFocus
                    placeholder="123456"
                    className="w-full px-4 py-3.5 rounded-xl border border-slate-200 focus:border-indigo-600 focus:ring-indigo-600/20 bg-white text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-4 transition-all duration-200 tracking-widest text-center text-lg"
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full h-12 mt-4 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl shadow-sm hover:shadow shadow-indigo-600/20 transition-all duration-200 disabled:opacity-70 flex items-center justify-center gap-2"
                >
                  {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Verify"}
                </button>

                <button
                  type="button"
                  onClick={() => { setPendingCredentials(null); setError(null); }}
                  className="w-full text-center text-sm font-semibold text-slate-500 hover:text-slate-700 transition-colors"
                >
                  Back to sign in
                </button>
              </form>
            ) : (
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">Email</label>
                  <input
                    {...register("email")}
                    type="email"
                    placeholder="Enter your email"
                    className={`w-full px-4 py-3.5 rounded-xl border ${errors.email ? 'border-red-300 focus:border-red-500 focus:ring-red-500/20' : 'border-slate-200 focus:border-indigo-600 focus:ring-indigo-600/20'} bg-white text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-4 transition-all duration-200`}
                  />
                  {errors.email && (
                    <p className="text-red-500 text-xs font-medium mt-1.5">{errors.email.message}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">Password</label>
                  <input
                    {...register("password")}
                    type="password"
                    placeholder="••••••••"
                    className={`w-full px-4 py-3.5 rounded-xl border ${errors.password ? 'border-red-300 focus:border-red-500 focus:ring-red-500/20' : 'border-slate-200 focus:border-indigo-600 focus:ring-indigo-600/20'} bg-white text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-4 transition-all duration-200`}
                  />
                  {errors.password && (
                    <p className="text-red-500 text-xs font-medium mt-1.5">{errors.password.message}</p>
                  )}
                </div>

                <div className="flex items-center justify-between pt-2">
                  <label className="flex items-center gap-2 cursor-pointer group">
                    <div className="relative flex items-center justify-center">
                      <input type="checkbox" className="peer appearance-none w-5 h-5 border-2 border-slate-300 rounded-md checked:bg-indigo-600 checked:border-indigo-600 transition-colors cursor-pointer" />
                      <svg className="absolute w-3 h-3 text-white opacity-0 peer-checked:opacity-100 pointer-events-none" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                    </div>
                    <span className="text-sm font-medium text-slate-600 group-hover:text-slate-900 transition-colors">Remember for 30 days</span>
                  </label>
                  <Link to="/forgot-password" className="text-sm font-semibold text-indigo-600 hover:text-indigo-700 transition-colors">
                    Forgot password?
                  </Link>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full h-12 mt-4 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl shadow-sm hover:shadow shadow-indigo-600/20 transition-all duration-200 disabled:opacity-70 flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    "Sign in"
                  )}
                </button>
              </form>
            )}

          </motion.div>
        </div>
      </div>
      </div>
    </>
  );
};

export default LoginPage;
