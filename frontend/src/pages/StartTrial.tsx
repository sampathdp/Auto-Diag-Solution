import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useApiMutation, useApiQuery } from "@/hooks/useApi";
import apiClient from "@/api/client";
import { Link, useSearchParams } from "react-router-dom";
import { ArrowLeft, CheckCircle2, Loader2, Tag, XCircle } from "lucide-react";
import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import Logo from "@/Assets/Logo.png";
import SEO from "@/components/SEO";

const trialSchema = z.object({
  salon_name: z.string().min(3, "Salon name is required"),
  owner_name: z.string().min(3, "Owner name is required"),
  email: z.string().email("Invalid email address"),
  phone: z.string().min(10, "Phone number is required"),
  address: z.string().min(5, "Physical address is required"),
  number_of_staff: z.string(),
  number_of_branches: z.string(),
  selected_plan: z.string(),
  plan_id: z.number().optional().or(z.string().transform(v => parseInt(v))),
  notes: z.string().optional(),
  promo_code: z.string().optional(),
});

type TrialFormValues = z.infer<typeof trialSchema>;

const StartTrial = () => {
  const [submitted, setSubmitted] = useState(false);
  const [showOtpVerify, setShowOtpVerify] = useState(false);
  const [registeredEmail, setRegisteredEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [otpError, setOtpError] = useState("");
  const [verifying, setVerifying] = useState(false);
  const [resendEmail, setResendEmail] = useState("");
  const [resendPending, setResendPending] = useState(false);
  const [resendError, setResendError] = useState("");
  const [searchParams] = useSearchParams();
  const planIdFromUrl = searchParams.get('planId');
  const promoFromUrl = searchParams.get('promo');

  const [promoStatus, setPromoStatus] = useState<"idle" | "checking" | "valid" | "invalid">("idle");
  const [promoMessage, setPromoMessage] = useState("");

  const { data: packages } = useApiQuery<any>(
    ['public-packages'],
    '/public/packages'
  );

  const { register, handleSubmit, setValue, watch, formState: { errors } } = useForm<TrialFormValues>({
    resolver: zodResolver(trialSchema),
    defaultValues: {
      number_of_staff: "1-5",
      number_of_branches: "1",
      selected_plan: planIdFromUrl === '1' ? 'starter' : (planIdFromUrl === '3' ? 'enterprise' : 'professional'),
      plan_id: planIdFromUrl ? parseInt(planIdFromUrl) : 2,
      promo_code: promoFromUrl || ""
    }
  });

  const selectedPlanId = watch('plan_id');
  const promoCodeValue = watch('promo_code');

  useEffect(() => {
    if (planIdFromUrl) {
      const id = parseInt(planIdFromUrl);
      setValue('plan_id', id);
      const pkg = packages?.data?.find((p: any) => p.id === id);
      if (pkg) setValue('selected_plan', pkg.name);
    }
  }, [planIdFromUrl, setValue, packages]);

  useEffect(() => {
    if (packages?.data && selectedPlanId) {
      const pkg = packages.data.find((p: any) => p.id === Number(selectedPlanId));
      if (pkg) setValue('selected_plan', pkg.name);
    }
  }, [selectedPlanId, packages, setValue]);

  useEffect(() => {
    if (promoFromUrl) {
      checkPromoCode(promoFromUrl);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [promoFromUrl]);

  const checkPromoCode = async (code: string) => {
    const trimmed = code.trim();
    if (!trimmed) {
      setPromoStatus("idle");
      setPromoMessage("");
      return;
    }
    setPromoStatus("checking");
    setPromoMessage("");
    try {
      const { data } = await apiClient.post("/public/promo-codes/validate", { code: trimmed });
      const info = data.data;
      setPromoStatus("valid");
      setPromoMessage(
        `${info.discount_percent}% off ${info.duration_months ? `your first ${info.duration_months} month${info.duration_months > 1 ? "s" : ""}` : "your subscription"}!`
      );
    } catch (err: any) {
      setPromoStatus("invalid");
      setPromoMessage(err?.response?.data?.message || "Invalid promo code.");
    }
  };

  const { mutate, isPending } = useApiMutation(
    (data: TrialFormValues) => apiClient.post("/trial/register", data),
    "Verification code sent to your email!",
    []
  );

  const onSubmit = (data: TrialFormValues) => {
    mutate(data, {
      onSuccess: () => {
        setRegisteredEmail(data.email);
        setOtp("");
        setOtpError("");
        setShowOtpVerify(true);
      }
    });
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (otp.length !== 6 || !/^\d+$/.test(otp)) {
      setOtpError("Please enter a valid 6-digit code.");
      return;
    }
    setOtpError("");
    setVerifying(true);
    try {
      await apiClient.post("/trial/verify", {
        email: registeredEmail,
        otp: otp
      });
      setSubmitted(true);
      setShowOtpVerify(false);
    } catch (err: any) {
      setOtpError(err?.response?.data?.message || "Invalid verification code. Please try again.");
    } finally {
      setVerifying(false);
    }
  };

  if (showOtpVerify) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-slate-50 relative overflow-hidden font-sans">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,_var(--tw-gradient-stops))] from-indigo-100 via-slate-50 to-white"></div>
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="max-w-md w-full rounded-3xl p-10 relative z-10 bg-white shadow-xl shadow-slate-200 border border-slate-100"
        >
          <div className="text-center mb-8">
            <h2 className="text-2xl font-bold text-slate-900 tracking-tight mb-2">Verify Your Email</h2>
            <p className="text-slate-500 text-sm leading-relaxed">
              We've sent a 6-digit verification code to <span className="font-semibold text-indigo-600">{registeredEmail}</span>. Please enter it below to complete your trial request.
            </p>
          </div>

          <form onSubmit={handleVerifyOtp} className="space-y-6">
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                Verification Code
              </label>
              <input
                type="text"
                maxLength={6}
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                placeholder="123456"
                className={`w-full h-14 px-4 text-center text-2xl font-mono tracking-[0.5em] border rounded-xl outline-none transition-all ${
                  otpError 
                    ? "border-red-500 bg-red-50/10 focus:ring-2 focus:ring-red-100" 
                    : "border-slate-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                }`}
                disabled={verifying}
              />
              {otpError && (
                <p className="text-xs text-red-500 mt-2 font-medium">{otpError}</p>
              )}
            </div>

            <button
              type="submit"
              disabled={verifying}
              className="w-full h-14 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-sm transition-all shadow-sm hover:shadow-md flex items-center justify-center disabled:opacity-50"
            >
              {verifying ? (
                <>
                  <Loader2 className="animate-spin mr-2" size={18} /> Verifying...
                </>
              ) : (
                "Verify Code"
              )}
            </button>
          </form>

          <div className="mt-8 text-center text-xs text-slate-400">
            Didn't receive the code? Check your spam folder or{" "}
            <button
              onClick={async () => {
                setOtpError("");
                setOtp("");
                try {
                  await apiClient.post("/trial/resend-otp", { email: registeredEmail });
                } catch (err: any) {
                  setOtpError(err?.response?.data?.message || "Failed to resend code. Please try again.");
                }
              }}
              className="text-indigo-600 font-bold hover:underline"
              disabled={verifying}
            >
              resend code
            </button>
          </div>
        </motion.div>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-slate-50 relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,_var(--tw-gradient-stops))] from-indigo-100 via-slate-50 to-white"></div>
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="max-w-md w-full rounded-3xl p-10 text-center relative z-10 bg-white shadow-xl shadow-slate-200 border border-slate-100"
        >
          <div className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6 bg-emerald-100 text-emerald-600">
            <CheckCircle2 size={40} />
          </div>
          <h2 className="text-3xl font-bold text-slate-900 tracking-tight mb-4">You're All Set!</h2>
          <p className="text-slate-500 mb-8 leading-relaxed text-sm">
            Your 14-day free trial has started. Check your inbox for your login credentials and get started right away.
          </p>
          <Link to="/">
            <button className="w-full h-14 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-sm transition-all shadow-sm hover:shadow-md">
              Back to Home
            </button>
          </Link>
        </motion.div>
      </div>
    );
  }

  return (
    <>
      <SEO 
        title="Start Your 14-Day Free Trial | SalonFlow"
        description="Join thousands of salons globally. Start your free trial of SalonFlow today and manage your salon with elegance."
      />
      <div className="min-h-screen flex flex-col lg:flex-row bg-slate-50 font-sans">
      {/* Left Side: Brand/Info */}
      <div className="lg:w-[40%] p-10 lg:p-16 text-white flex flex-col justify-between relative overflow-hidden bg-slate-900">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,_var(--tw-gradient-stops))] from-indigo-900/40 via-slate-900 to-black"></div>
        <div className="absolute -top-32 -left-32 w-96 h-96 bg-indigo-500/20 rounded-full blur-3xl"></div>
        <div className="absolute -bottom-32 -right-32 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl"></div>

        <div className="relative z-10">
          <Link to="/" className="flex justify-center mb-12 hover:opacity-90 transition-opacity">
            <img src={Logo} alt="SalonFlow" className="h-32 sm:h-48 object-contain" />
          </Link>

          <h1 className="text-4xl md:text-5xl font-bold leading-tight mb-6 tracking-tight">
            Start your 14-day <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-cyan-400">free trial today.</span>
          </h1>
          <p className="text-lg mb-10 text-slate-400 max-w-md leading-relaxed">
            No credit card required. Full access to all Professional features. Set up in minutes.
          </p>
          
          <ul className="space-y-5">
            {["Smart Scheduling", "Staff Management", "Advanced Analytics"].map((f, i) => (
              <li key={i} className="flex items-center text-sm font-medium text-slate-300">
                <CheckCircle2 size={18} className="mr-3 text-emerald-400" /> {f}
              </li>
            ))}
          </ul>
        </div>
        
        <div className="text-sm relative z-10 pt-12 text-slate-400">
          Already have an account? <Link to="/login" className="text-white font-bold hover:underline">Login here</Link>
        </div>
      </div>

      {/* Right Side: Form */}
      <div className="lg:w-[60%] p-6 sm:p-10 lg:p-16 overflow-y-auto relative bg-white flex items-center justify-center">
        <div className="w-full max-w-2xl relative z-10">
          <Link to="/" className="inline-flex items-center hover:text-slate-900 transition-colors mb-8 text-sm font-medium text-slate-500">
            <ArrowLeft size={16} className="mr-2" /> Back to Home
          </Link>

          <div className="mb-10">
            <h2 className="text-3xl font-bold text-slate-900 tracking-tight mb-2">
              Tell us about your salon
            </h2>
            <p className="text-slate-500">We'll set up your account based on these details.</p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Salon Name</label>
                <input 
                  {...register("salon_name")} 
                  className={`w-full px-4 py-3.5 rounded-xl border ${errors.salon_name ? 'border-red-300 focus:border-red-500 focus:ring-red-500/20' : 'border-slate-200 focus:border-indigo-600 focus:ring-indigo-600/20'} bg-slate-50 focus:bg-white text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-4 transition-all duration-200`}
                  placeholder="Elite Hair Studio" 
                />
                {errors.salon_name && <p className="text-red-500 text-xs font-medium mt-1.5">{errors.salon_name.message}</p>}
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Owner Full Name</label>
                <input 
                  {...register("owner_name")} 
                  className={`w-full px-4 py-3.5 rounded-xl border ${errors.owner_name ? 'border-red-300 focus:border-red-500 focus:ring-red-500/20' : 'border-slate-200 focus:border-indigo-600 focus:ring-indigo-600/20'} bg-slate-50 focus:bg-white text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-4 transition-all duration-200`}
                  placeholder="John Doe" 
                />
                {errors.owner_name && <p className="text-red-500 text-xs font-medium mt-1.5">{errors.owner_name.message}</p>}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Email Address</label>
                <input 
                  type="email" 
                  {...register("email")} 
                  className={`w-full px-4 py-3.5 rounded-xl border ${errors.email ? 'border-red-300 focus:border-red-500 focus:ring-red-500/20' : 'border-slate-200 focus:border-indigo-600 focus:ring-indigo-600/20'} bg-slate-50 focus:bg-white text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-4 transition-all duration-200`}
                  placeholder="john@example.com" 
                />
                {errors.email && <p className="text-red-500 text-xs font-medium mt-1.5">{errors.email.message}</p>}
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Phone Number</label>
                <input 
                  {...register("phone")} 
                  className={`w-full px-4 py-3.5 rounded-xl border ${errors.phone ? 'border-red-300 focus:border-red-500 focus:ring-red-500/20' : 'border-slate-200 focus:border-indigo-600 focus:ring-indigo-600/20'} bg-slate-50 focus:bg-white text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-4 transition-all duration-200`}
                  placeholder="+94 77 123 4567" 
                />
                {errors.phone && <p className="text-red-500 text-xs font-medium mt-1.5">{errors.phone.message}</p>}
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">Physical Address</label>
              <input 
                {...register("address")} 
                className={`w-full px-4 py-3.5 rounded-xl border ${errors.address ? 'border-red-300 focus:border-red-500 focus:ring-red-500/20' : 'border-slate-200 focus:border-indigo-600 focus:ring-indigo-600/20'} bg-slate-50 focus:bg-white text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-4 transition-all duration-200`}
                placeholder="123 Main Street, Colombo 07" 
              />
              {errors.address && <p className="text-red-500 text-xs font-medium mt-1.5">{errors.address.message}</p>}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Staff Count</label>
                <select 
                  {...register("number_of_staff")} 
                  className="w-full px-4 py-3.5 rounded-xl border border-slate-200 focus:border-indigo-600 focus:ring-indigo-600/20 bg-slate-50 focus:bg-white text-slate-900 focus:outline-none focus:ring-4 transition-all duration-200 appearance-none"
                >
                  <option value="1-5">1-5 Staff</option>
                  <option value="6-20">6-20 Staff</option>
                  <option value="20+">20+ Staff</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Branches</label>
                <select 
                  {...register("number_of_branches")} 
                  className="w-full px-4 py-3.5 rounded-xl border border-slate-200 focus:border-indigo-600 focus:ring-indigo-600/20 bg-slate-50 focus:bg-white text-slate-900 focus:outline-none focus:ring-4 transition-all duration-200 appearance-none"
                >
                  <option value="1">1 Branch</option>
                  <option value="2-5">2-5 Branches</option>
                  <option value="5+">5+ Branches</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Plan Interest</label>
                <select 
                  {...register("plan_id")} 
                  className="w-full px-4 py-3.5 rounded-xl border border-slate-200 focus:border-indigo-600 focus:ring-indigo-600/20 bg-slate-50 focus:bg-white text-slate-900 focus:outline-none focus:ring-4 transition-all duration-200 appearance-none"
                >
                  {packages?.data?.filter((p: any) => p.name.toLowerCase() !== 'free').map((p: any) => (
                    <option key={p.id} value={p.id.toString()}>{p.display_name}</option>
                  ))}
                </select>
              </div>
            </div>

            <input type="hidden" {...register("selected_plan")} />

            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">
                Promo Code <span className="font-normal text-slate-400">(optional)</span>
              </label>
              <div className="flex gap-3">
                <div className="relative flex-1">
                  <Tag size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    {...register("promo_code")}
                    onChange={(e) => {
                      setValue('promo_code', e.target.value.toUpperCase());
                      if (promoStatus !== "idle") {
                        setPromoStatus("idle");
                        setPromoMessage("");
                      }
                    }}
                    className="w-full pl-11 pr-4 py-3.5 rounded-xl border border-slate-200 focus:border-indigo-600 focus:ring-indigo-600/20 bg-slate-50 focus:bg-white text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-4 transition-all duration-200 uppercase"
                    placeholder="e.g. WELCOME50"
                  />
                </div>
                <button
                  type="button"
                  disabled={!promoCodeValue?.trim() || promoStatus === "checking"}
                  onClick={() => checkPromoCode(promoCodeValue || "")}
                  className="px-5 py-3.5 bg-slate-800 hover:bg-slate-700 text-white text-sm font-semibold rounded-xl transition-all disabled:opacity-50 flex items-center gap-2 whitespace-nowrap"
                >
                  {promoStatus === "checking" ? <Loader2 className="w-4 h-4 animate-spin" /> : "Apply"}
                </button>
              </div>
              {promoStatus === "valid" && (
                <p className="text-emerald-600 text-xs font-semibold mt-1.5 flex items-center gap-1.5">
                  <CheckCircle2 size={14} /> {promoMessage}
                </p>
              )}
              {promoStatus === "invalid" && (
                <p className="text-red-500 text-xs font-medium mt-1.5 flex items-center gap-1.5">
                  <XCircle size={14} /> {promoMessage}
                </p>
              )}
            </div>

            <button
              type="submit"
              disabled={isPending}
              className="w-full h-14 mt-8 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl shadow-sm hover:shadow-md shadow-indigo-600/20 transition-all duration-200 disabled:opacity-70 flex items-center justify-center gap-2"
            >
              {isPending ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                "Submit Trial Request"
              )}
            </button>
          </form>

          <div className="mt-10 pt-8 border-t border-slate-100">
            <p className="text-sm font-semibold text-slate-700 mb-1">Already submitted a request?</p>
            <p className="text-xs text-slate-400 mb-4">If you registered but didn't verify your email, enter your email below to resend the verification code.</p>
            <div className="flex gap-3">
              <input
                type="email"
                value={resendEmail}
                onChange={(e) => { setResendEmail(e.target.value); setResendError(""); }}
                placeholder="your@email.com"
                className="flex-1 px-4 py-3 rounded-xl border border-slate-200 focus:border-indigo-600 focus:ring-indigo-600/20 bg-slate-50 focus:bg-white text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-4 transition-all duration-200 text-sm"
                disabled={resendPending}
              />
              <button
                type="button"
                disabled={resendPending || !resendEmail}
                onClick={async () => {
                  setResendError("");
                  setResendPending(true);
                  try {
                    await apiClient.post("/trial/resend-otp", { email: resendEmail });
                    setRegisteredEmail(resendEmail);
                    setOtp("");
                    setOtpError("");
                    setShowOtpVerify(true);
                  } catch (err: any) {
                    setResendError(err?.response?.data?.message || "No trial request found for this email.");
                  } finally {
                    setResendPending(false);
                  }
                }}
                className="px-5 py-3 bg-slate-800 hover:bg-slate-700 text-white text-sm font-semibold rounded-xl transition-all disabled:opacity-50 flex items-center gap-2 whitespace-nowrap"
              >
                {resendPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Resend Code"}
              </button>
            </div>
            {resendError && <p className="text-xs text-red-500 mt-2 font-medium">{resendError}</p>}
          </div>
        </div>
      </div>
      </div>
    </>
  );
};

export default StartTrial;
