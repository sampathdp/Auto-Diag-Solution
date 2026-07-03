import { Link, useNavigate } from "react-router-dom";
import { useAuthStore } from "@/store/useAuthStore";
import { useState, useEffect, useRef } from "react";
import {
  motion,
  AnimatePresence,
  useScroll,
  useTransform,
} from "framer-motion";
import apiClient from "@/api/client";
import {
  Calendar,
  Users,
  TrendingUp,
  ArrowRight,
  Menu,
  X,
  CreditCard,
  Layers,
  Clock,
  Package,
  Check,
  QrCode,
  Smartphone,
  Shield,
  MessageSquare,
  MapPin,
  Scissors,
  Sparkles,
  Star,
  Zap,
  XCircle,
  CheckCircle2,
  Heart,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import logoImg from "@/Assets/Logo.png";
import SEO from "@/components/SEO";

const LandingPage = () => {
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();

  const toggleLanguage = () => {
    i18n.changeLanguage(i18n.language.startsWith('si') ? 'en' : 'si');
  };

  const { isAuthenticated, user } = useAuthStore();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [plans, setPlans] = useState<any[]>([]);
  const [simService, setSimService] = useState("Hair Cut & Styling");
  const [simStaff, setSimStaff] = useState("Sanduni Perera");
  const [simTime, setSimTime] = useState("10:30 AM");
  const [simNotificationSent, setSimNotificationSent] = useState(false);
  const [simLoading, setSimLoading] = useState(false);
  const [demoPoints, setDemoPoints] = useState(140);
  const [selectedPayMethod, setSelectedPayMethod] = useState("LankaQR");
  const [demoStockAlert, setDemoStockAlert] = useState(2);
  const [activeFeature, setActiveFeature] = useState(0);
  const [dashboardView, setDashboardView] = useState<"admin" | "booking">("admin");
  const heroRef = useRef<HTMLDivElement>(null);
  const { scrollY } = useScroll();
  const heroParallax = useTransform(scrollY, [0, 600], [0, -60]);

  // Promo banner: 50% off first 6 months for new signups this month
  const PROMO_BANNER_KEY = "salonflow_promo50_6mo_dismissed";
  const [showPromoBanner, setShowPromoBanner] = useState(
    () => localStorage.getItem(PROMO_BANNER_KEY) !== "true",
  );
  const [promoBannerHeight, setPromoBannerHeight] = useState(0);
  const promoBannerRef = useRef<HTMLDivElement>(null);

  const dismissPromoBanner = () => {
    setShowPromoBanner(false);
    localStorage.setItem(PROMO_BANNER_KEY, "true");
  };

  useEffect(() => {
    const measure = () =>
      setPromoBannerHeight(
        showPromoBanner ? (promoBannerRef.current?.offsetHeight || 0) : 0,
      );
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, [showPromoBanner]);

  // Contact Form States
  const [contactName, setContactName] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [contactSubject, setContactSubject] = useState("General Inquiry");
  const [contactMessage, setContactMessage] = useState("");
  const [contactLoading, setContactLoading] = useState(false);
  const [contactSuccess, setContactSuccess] = useState<string | null>(null);
  const [contactError, setContactError] = useState<string | null>(null);

  const handleContactSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setContactLoading(true);
    setContactSuccess(null);
    setContactError(null);

    if (!contactName.trim()) {
      setContactError("Please enter your name.");
      setContactLoading(false);
      return;
    }
    if (!contactEmail.trim() || !/\S+@\S+\.\S+/.test(contactEmail)) {
      setContactError("Please enter a valid email address.");
      setContactLoading(false);
      return;
    }
    if (!contactMessage.trim() || contactMessage.length < 10) {
      setContactError("Please enter a message of at least 10 characters.");
      setContactLoading(false);
      return;
    }

    try {
      const response = await apiClient.post("/contact/submit", {
        name: contactName,
        email: contactEmail,
        subject: contactSubject,
        message: contactMessage,
      });
      setContactSuccess(response.data.message || "Your message was sent successfully!");
      setContactName("");
      setContactEmail("");
      setContactSubject("General Inquiry");
      setContactMessage("");
    } catch (err: any) {
      setContactError(err.response?.data?.message || "Something went wrong. Please try again.");
    } finally {
      setContactLoading(false);
    }
  };

  useEffect(() => {
    if (isAuthenticated)
      navigate(
        user?.role === "super_admin" ? "/admin/dashboard" : "/dashboard",
      );
  }, [isAuthenticated, user, navigate]);

  useEffect(() => {
    apiClient
      .get("/public/packages")
      .then((res) => setPlans(res.data.data || []))
      .catch(() => {});
  }, []);

  const parseFeatures = (featuresObj: any): string[] => {
    if (!featuresObj || typeof featuresObj !== "object") return [];
    return Object.entries(featuresObj)
      .filter(([_, val]) => val !== "NO")
      .map(([key, val]) => (val === "YES" ? key : `${key}: ${val}`));
  };

  const features = [
    {
      icon: Calendar,
      title: "Visual Scheduling",
      desc: "Drag-and-drop roster board mapping stylist timetables, overlapping sessions, and walk-in blocks.",
    },
    {
      icon: CreditCard,
      title: "LankaQR Checkout",
      desc: "Accept LankaQR payments on any tablet. Support cash, card, and billing invoices instantly.",
    },
    {
      icon: Users,
      title: "Loyalty CRM",
      desc: "Profile client preferences, visit histories, and automatically credit loyalty rewards.",
    },
    {
      icon: Package,
      title: "Inventory Alerts",
      desc: "Automated low-stock reminders. Track volume usage and product sales margins.",
    },
    {
      icon: Layers,
      title: "Multi-Branch Control",
      desc: "Keep branches synced with cross-location stylist rosters and revenue dashboards.",
    },
    {
      icon: TrendingUp,
      title: "Performance Reports",
      desc: "Track stylist commission shares, check-in averages, and product upsell ratios.",
    },
    {
      icon: MessageSquare,
      title: "Smart Notifications",
      desc: "Instant HTML confirmations, automatic calendar reminders 1 hour before, and SMS alerts to clients.",
    },
  ];

  const handleSimulateBook = () => {
    setSimLoading(true);
    setTimeout(() => {
      setSimLoading(false);
      setSimNotificationSent(true);
    }, 900);
  };

  return (
    <>
      <SEO 
        title="SalonFlow | #1 Salon Software in Sri Lanka & Worldwide"
        description="Manage your salon with elegance. The premium salon management software trusted by salons in Colombo, Kandy, Galle, and globally. Features smart scheduling, staff management, and analytics."
      />
      <div
        style={{ fontFamily: "'DM Sans', sans-serif", background: "#F7FAFC" }}
        className="min-h-screen text-[#0F2133] overflow-x-hidden select-none relative"
      >
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Sora:wght@300;400;500;600;700;800&family=DM+Sans:ital,wght@0,300;0,400;0,500;0,600;0,700;1,400&display=swap');

        .font-display { font-family: 'Sora', sans-serif; }
        .font-body { font-family: 'DM Sans', sans-serif; }

        :root {
          --sky: #F7FAFC;
          --sky-2: #EDF4FA;
          --sky-3: #DCEEF8;
          --sky-4: #C8E3F5;
          --blue: #2E86C1;
          --blue-light: #5BA3D4;
          --blue-pale: #E8F4FB;
          --blue-deep: #1A5F8A;
          --blue-vivid: #1B9CDB;
          --sage: #5A8A7A;
          --sage-light: #7DB5A2;
          --sage-pale: #E6F2EE;
          --sage-deep: #3D6B5C;
          --sand: #F5F0E8;
          --sand-2: #EDE6D8;
          --sand-3: #E2D8C8;
          --sand-accent: #C8A87A;
          --sand-pale: #FBF8F3;
          --ink: #0F2133;
          --ink-mid: #2A4A66;
          --ink-light: #4A6E8C;
          --ink-muted: #7A9AB5;
          --ink-faint: #B8CCE0;
          --border: rgba(15,33,51,0.08);
          --border-blue: rgba(46,134,193,0.2);
          --shadow-soft: 0 2px 16px rgba(46,134,193,0.07), 0 1px 4px rgba(15,33,51,0.05);
          --shadow-card: 0 4px 32px rgba(46,134,193,0.09), 0 1px 8px rgba(15,33,51,0.04);
          --shadow-lift: 0 16px 56px rgba(46,134,193,0.13), 0 4px 16px rgba(15,33,51,0.06);
        }

        html { scroll-behavior: smooth; }

        /* Airy dot pattern */
        .dot-texture {
          background-image: radial-gradient(circle, rgba(46,134,193,0.05) 1px, transparent 1px);
          background-size: 28px 28px;
        }

        /* Gentle sky mesh */
        .sky-mesh {
          background:
            radial-gradient(ellipse 65% 55% at 85% 15%, rgba(27,156,219,0.07) 0%, transparent 60%),
            radial-gradient(ellipse 50% 60% at 5% 85%, rgba(90,138,122,0.06) 0%, transparent 60%),
            radial-gradient(ellipse 70% 40% at 45% 55%, rgba(245,240,232,0.6) 0%, transparent 100%);
        }

        @keyframes marquee {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        .marquee-track { display: flex; width: max-content; animation: marquee 35s linear infinite; }
        .marquee-track:hover { animation-play-state: paused; }

        @keyframes float-a { 0%,100%{transform:translateY(0) rotate(-2deg)} 50%{transform:translateY(-14px) rotate(-2deg)} }
        @keyframes float-b { 0%,100%{transform:translateY(0) rotate(1.5deg)} 50%{transform:translateY(-10px) rotate(1.5deg)} }
        @keyframes float-c { 0%,100%{transform:translateY(0) rotate(-0.5deg)} 50%{transform:translateY(-8px) rotate(-0.5deg)} }
        .float-a { animation: float-a 5s ease-in-out infinite; }
        .float-b { animation: float-b 6.5s ease-in-out infinite 1s; }
        .float-c { animation: float-c 4.5s ease-in-out infinite 0.5s; }

        @keyframes shimmer-sky {
          0% { background-position: -200% center; }
          100% { background-position: 200% center; }
        }
        .btn-primary {
          background: linear-gradient(135deg, #2E86C1 0%, #5BA3D4 40%, #1B9CDB 70%, #2E86C1 100%);
          background-size: 200% auto;
          animation: shimmer-sky 4s linear infinite;
          color: #fff;
          box-shadow: 0 6px 20px rgba(46,134,193,0.32), 0 2px 6px rgba(46,134,193,0.18);
        }
        .btn-primary:hover { box-shadow: 0 10px 28px rgba(46,134,193,0.42), 0 3px 10px rgba(46,134,193,0.22); transform: translateY(-1px); }
        .btn-primary:active { transform: translateY(0) scale(0.98); }

        .btn-outline {
          background: rgba(255,255,255,0.85);
          border: 1.5px solid var(--border-blue);
          color: var(--blue);
          backdrop-filter: blur(8px);
        }
        .btn-outline:hover { background: var(--blue-pale); border-color: var(--blue); }

        .nav-link {
          color: var(--ink-light);
          font-weight: 600;
          font-size: 14px;
          transition: color 0.2s;
        }
        .nav-link:hover { color: var(--blue); }

        .card-airy {
          background: rgba(255,255,255,0.88);
          border: 1px solid var(--border);
          border-radius: 20px;
          box-shadow: var(--shadow-card);
          backdrop-filter: blur(12px);
          transition: all 0.3s cubic-bezier(0.22, 1, 0.36, 1);
        }
        .card-airy:hover {
          transform: translateY(-4px);
          box-shadow: var(--shadow-lift);
          border-color: rgba(46,134,193,0.18);
        }

        .pricing-popular {
          background: linear-gradient(150deg, #1A5F8A 0%, #0F3D5C 50%, #0A2840 100%);
          border: none !important;
          box-shadow: 0 24px 64px rgba(15,33,51,0.22), 0 8px 24px rgba(46,134,193,0.15);
        }

        .feature-pill {
          transition: all 0.25s ease;
          cursor: pointer;
          border-left: 3px solid transparent;
          border-radius: 0 12px 12px 0;
        }
        .feature-pill.active {
          border-left-color: var(--blue);
          background: linear-gradient(90deg, var(--blue-pale), transparent);
        }
        .feature-pill:hover:not(.active) { background: rgba(46,134,193,0.04); }

        .tag-badge {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 5px 14px;
          border-radius: 100px;
          font-size: 11px;
          font-weight: 700;
          letter-spacing: 0.08em;
          text-transform: uppercase;
        }

        @keyframes pulse-dot { 0%,100%{transform:scale(1);opacity:1} 50%{transform:scale(1.4);opacity:0.7} }
        .pulse-dot { animation: pulse-dot 2s ease-in-out infinite; }

        @keyframes check-pop { 0%{transform:scale(0) rotate(-10deg)} 60%{transform:scale(1.2) rotate(3deg)} 100%{transform:scale(1) rotate(0)} }
        .check-pop { animation: check-pop 0.4s cubic-bezier(0.34,1.56,0.64,1); }

        input[type=range] {
          -webkit-appearance: none;
          background: transparent;
          width: 100%;
        }
        input[type=range]::-webkit-slider-runnable-track {
          height: 4px;
          background: var(--sky-3);
          border-radius: 4px;
        }
        input[type=range]::-webkit-slider-thumb {
          -webkit-appearance: none;
          width: 18px; height: 18px;
          border-radius: 50%;
          background: var(--blue);
          margin-top: -7px;
          cursor: pointer;
          box-shadow: 0 2px 8px rgba(46,134,193,0.4);
        }

        .separator-ornament {
          display: flex;
          align-items: center;
          gap: 16px;
          color: var(--ink-faint);
          font-size: 12px;
        }
        .separator-ornament::before, .separator-ornament::after {
          content: '';
          flex: 1;
          height: 1px;
          background: linear-gradient(90deg, transparent, var(--ink-faint), transparent);
        }

        /* Stripe texture */
        .stripe-sky {
          background-image: repeating-linear-gradient(
            -45deg,
            transparent,
            transparent 24px,
            rgba(46,134,193,0.015) 24px,
            rgba(46,134,193,0.015) 48px
          );
        }
      `}</style>

      {/* Dot texture overlay */}
      <div
        className="fixed inset-0 dot-texture pointer-events-none"
        style={{ zIndex: 0 }}
      />

      {/* Sky mesh ambient */}
      <div
        className="fixed inset-0 sky-mesh pointer-events-none"
        style={{ zIndex: 0 }}
      />

      {/* ── PROMO BANNER ───────────────────────────────────── */}
      <AnimatePresence>
        {showPromoBanner && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="fixed top-0 w-full z-[60] overflow-hidden"
            style={{
              background: "linear-gradient(90deg, var(--blue-deep), var(--blue-vivid))",
            }}
          >
            <div
              ref={promoBannerRef}
              className="max-w-7xl mx-auto px-4 sm:px-10 py-2.5 flex items-center justify-center gap-3 flex-wrap text-center relative"
            >
              <p className="text-xs sm:text-sm font-semibold text-white flex items-center gap-2 flex-wrap justify-center">
                <span>{t('promoBanner.text', "🎉 Limited Time: New signups this month get 50% OFF for their first 6 months!")}</span>
                <Link
                  to="/start-trial"
                  className="underline decoration-2 underline-offset-2 hover:opacity-80 transition-opacity whitespace-nowrap font-bold"
                  style={{ color: "#fff" }}
                >
                  {t('promoBanner.cta', "Claim Offer")} →
                </Link>
              </p>
              <button
                onClick={dismissPromoBanner}
                aria-label="Dismiss promo banner"
                className="absolute right-2 sm:right-6 p-1 rounded-full hover:bg-white/20 transition-colors"
              >
                <X size={16} color="#fff" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── NAVBAR ─────────────────────────────────────────── */}
      <nav
        className="fixed w-full z-50 transition-all duration-300"
        style={{
          top: promoBannerHeight,
          background: "rgba(247,250,252,0.90)",
          backdropFilter: "blur(20px)",
          borderBottom: "1px solid rgba(46,134,193,0.1)",
          boxShadow: "0 2px 16px rgba(46,134,193,0.06)",
        }}
      >
        <div className="max-w-7xl mx-auto px-6 sm:px-10 h-[68px] flex items-center justify-between">
          <div className="flex items-center">
            <img src={logoImg} alt="SalonFlow" className="h-16 md:h-20 object-contain" />
          </div>

          <div className="hidden md:flex items-center gap-8">
            {[
              ["#features", t('nav.features')],
              ["#pricing", t('nav.pricing')],
              ["#contact", t('nav.contact')],
            ].map(([href, label]) => (
              <a key={label} href={href} className="nav-link">
                {label}
              </a>
            ))}

            <button 
              onClick={toggleLanguage}
              className="text-sm font-semibold px-3 py-1 rounded-full cursor-pointer hover:opacity-80 transition-opacity"
              style={{ background: "var(--blue-pale)", color: "var(--blue)" }}
            >
              {i18n.language.startsWith('si') ? 'English' : 'සිංහල'}
            </button>

            <Link to="/login" className="nav-link">
              {t('nav.login')}
            </Link>
            <Link to="/start-trial">
              <button
                className="btn-primary font-bold px-6 py-2.5 rounded-full text-xs tracking-wider transition-all uppercase"
                style={{ fontFamily: "DM Sans" }}
              >
                {t('nav.startTrial')}
              </button>
            </Link>
          </div>

          <button
            className="md:hidden p-2"
            style={{ color: "var(--ink-light)" }}
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>

        <AnimatePresence>
          {mobileMenuOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              style={{
                background: "var(--sky)",
                borderBottom: "1px solid var(--border)",
              }}
              className="md:hidden px-8 py-6 space-y-4 overflow-hidden"
            >
              {[
                ["#features", "Features"],
                ["#live-demo", "Live Demo"],
                ["#pricing", "Pricing"],
                ["#contact", "Contact"],
                ["/login", "Login"],
              ].map(([href, label]) =>
                href.startsWith("/") ? (
                  <Link
                    key={label}
                    to={href}
                    onClick={() => setMobileMenuOpen(false)}
                    className="block py-2"
                    style={{
                      color: "var(--ink-light)",
                      fontSize: 16,
                      fontWeight: 600,
                    }}
                  >
                    {label}
                  </Link>
                ) : (
                  <a
                    key={label}
                    href={href}
                    onClick={() => setMobileMenuOpen(false)}
                    className="block py-2"
                    style={{
                      color: "var(--ink-light)",
                      fontSize: 16,
                      fontWeight: 600,
                    }}
                  >
                    {label}
                  </a>
                ),
              )}
              <Link to="/start-trial" onClick={() => setMobileMenuOpen(false)}>
                <button className="btn-primary w-full font-bold py-3.5 rounded-2xl text-sm mt-2">
                  Start Free Trial
                </button>
              </Link>
            </motion.div>
          )}
        </AnimatePresence>
      </nav>

      {/* ── HERO ───────────────────────────────────────────── */}
      <section
        ref={heroRef}
        className="min-h-screen flex items-center pb-20 relative overflow-hidden"
        style={{ zIndex: 1, paddingTop: `calc(6rem + ${promoBannerHeight}px)` }}
      >
        {/* Modern grid overlay & ambient glowing light spots */}
        <div className="absolute inset-0 bg-grid-slate-100 [mask-image:radial-gradient(ellipse_at_center,white,transparent)] pointer-events-none opacity-40" />
        <div
          className="absolute -right-32 top-12 w-[600px] h-[600px] rounded-full opacity-60 pointer-events-none blur-[120px]"
          style={{
            background:
              "radial-gradient(circle, rgba(46,134,193,0.18) 0%, rgba(91,163,212,0.05) 70%, transparent 100%)",
          }}
        />
        <div
          className="absolute -left-32 bottom-12 w-[500px] h-[500px] rounded-full opacity-50 pointer-events-none blur-[100px]"
          style={{
            background:
              "radial-gradient(circle, rgba(90,138,122,0.15) 0%, rgba(125,181,162,0.05) 70%, transparent 100%)",
          }}
        />

        <motion.div
          style={{ y: heroParallax }}
          className="max-w-7xl mx-auto px-6 sm:px-10 w-full relative z-10"
        >
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-16 items-center">
            {/* Left Column: Copy & CTAs */}
            <div className="lg:col-span-5 space-y-8">
              <motion.div
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
                className="space-y-6"
              >
                <div
                  className="tag-badge shadow-sm inline-flex items-center gap-2 border px-4 py-1.5 rounded-full"
                  style={{
                    background: "rgba(90,138,122,0.08)",
                    color: "var(--sage-deep)",
                    borderColor: "rgba(90,138,122,0.15)",
                  }}
                >
                  <span
                    className="pulse-dot w-2 h-2 rounded-full"
                    style={{ background: "var(--sage)" }}
                  />
                  <span className="text-[10px] font-black tracking-wider uppercase">{t('hero.badge')}</span>
                </div>

                <h1
                  className="font-display tracking-tight text-slate-900"
                  style={{
                    fontSize: "clamp(44px, 5.5vw, 68px)",
                    fontWeight: 800,
                    lineHeight: 1.08,
                    letterSpacing: "-0.025em",
                  }}
                >
                  {t('hero.title1')}
                  <br />
                  <span className="bg-gradient-to-r from-blue-600 to-indigo-500 bg-clip-text text-transparent font-black">
                    {t('hero.title2')}
                  </span>
                </h1>

                <p
                  className="font-body text-slate-500"
                  style={{
                    fontSize: 16,
                    lineHeight: 1.7,
                    maxWidth: 460,
                  }}
                >
                  {t('hero.subtitle')}
                </p>
              </motion.div>

              {/* Action Buttons */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: 0.15, ease: [0.16, 1, 0.3, 1] }}
                className="flex flex-wrap gap-4"
              >
                <Link to="/start-trial">
                  <button
                    className="btn-primary h-14 px-8 rounded-2xl font-bold flex items-center gap-3 transition-all hover:scale-[1.02] active:scale-[0.98] shadow-lg shadow-blue-500/20"
                    style={{ fontSize: 14 }}
                  >
                    {t('hero.ctaPrimary')} <ArrowRight size={16} />
                  </button>
                </Link>
                <a href="#pricing">
                  <button
                    className="btn-outline h-14 px-8 rounded-2xl font-bold flex items-center gap-2 transition-all hover:scale-[1.02] active:scale-[0.98]"
                    style={{ fontSize: 14 }}
                  >
                    {t('hero.ctaSecondary')}
                  </button>
                </a>
              </motion.div>

              {/* Stats Row */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.8, delay: 0.3 }}
                className="pt-8 grid grid-cols-3 gap-4 border-t border-slate-200/60"
              >
                {[
                  ["100+", "Active Salons"],
                  ["LankaQR", "Native Support"],
                  ["14 Days", "Free Trial"],
                ].map(([val, label]) => (
                  <div
                    key={label}
                    className="p-4 rounded-2xl border bg-white/70 backdrop-blur-md hover:shadow-md transition-all duration-300"
                    style={{
                      borderColor: "var(--border)",
                    }}
                  >
                    <div
                      style={{
                        fontFamily: "Sora",
                        fontSize: 20,
                        fontWeight: 800,
                        color: "var(--blue)",
                      }}
                    >
                      {val}
                    </div>
                    <div
                      style={{
                        color: "var(--ink-muted)",
                        fontSize: 11,
                        marginTop: 4,
                        fontWeight: 700,
                      }}
                    >
                      {label}
                    </div>
                  </div>
                ))}
              </motion.div>
            </div>

            {/* Right Column: Unified Premium Dashboard Mockup */}
            <div className="lg:col-span-7 hidden lg:block relative">
              {/* Toggle Buttons */}
              <div className="flex justify-center gap-2 mb-6">
                <button
                  onClick={() => setDashboardView("admin")}
                  className={`px-5 py-2 rounded-full text-xs font-black tracking-wider uppercase transition-all duration-300 ${
                    dashboardView === "admin"
                      ? "bg-blue-600 text-white shadow-md shadow-blue-500/20"
                      : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"
                  }`}
                >
                  Admin Control Panel
                </button>
                <button
                  onClick={() => setDashboardView("booking")}
                  className={`px-5 py-2 rounded-full text-xs font-black tracking-wider uppercase transition-all duration-300 ${
                    dashboardView === "booking"
                      ? "bg-blue-600 text-white shadow-md shadow-blue-500/20"
                      : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"
                  }`}
                >
                  Client Booking Portal
                </button>
              </div>

              <AnimatePresence mode="wait">
                {dashboardView === "admin" ? (
                  <motion.div
                    key="admin"
                    initial={{ opacity: 0, scale: 0.96, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.96, y: -20 }}
                    transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
                    whileHover={{ y: -4, rotateY: -2, rotateX: 1, scale: 1.01 }}
                    style={{
                      transformStyle: "preserve-3d",
                      perspective: 1000,
                    }}
                    className="w-full bg-white border border-slate-200/80 rounded-[2.2rem] shadow-2xl p-6 relative overflow-hidden backdrop-blur-xl"
                  >
                    {/* Dashboard App Bar */}
                    <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-4">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center font-bold text-sm shadow-md">SF</div>
                        <div>
                          <h3 className="text-xs font-black text-slate-800 leading-none">SalonFlow Dashboard</h3>
                          <span className="text-[9px] font-bold text-slate-400">Kandy Branch Studio</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                        <span className="text-[10px] font-bold text-slate-500 bg-slate-50 border border-slate-100 px-2.5 py-1 rounded-lg">Live Synced</span>
                      </div>
                    </div>

                    {/* Top Notification banner */}
                    <div className="mb-4 p-3 bg-indigo-50/50 border border-indigo-100/60 rounded-2xl flex items-center gap-3 shadow-sm">
                      <div className="w-8 h-8 rounded-xl bg-indigo-100 flex items-center justify-center text-indigo-600 shrink-0 shadow-inner">
                        <Calendar size={14} className="stroke-[2.5]" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <span className="text-[9px] font-black text-indigo-700 uppercase tracking-wider">Calendar Alert</span>
                          <span className="text-[9px] text-amber-700 font-bold bg-amber-50 px-2 py-0.5 rounded-md">1h Reminder Sent</span>
                        </div>
                        <p className="text-[10px] text-slate-600 font-medium mt-0.5">
                          Haircut with <strong>Sanduni P.</strong> starts at 10:30 AM. Invites delivered to customer.
                        </p>
                      </div>
                    </div>

                    {/* Dashboard Layout Widgets */}
                    <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                      {/* Left Column: Schedule (7 cols) */}
                      <div className="md:col-span-7 space-y-3">
                        <div className="flex items-center justify-between pb-1">
                          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Today's Appointments</span>
                          <span className="text-[9px] font-bold text-blue-600">3 slots left</span>
                        </div>

                        {[
                          { name: "Nimali Perera", service: "Balayage Color & Cut", time: "10:30 AM", active: true, tag: "1h Alert Sent", tagColor: "bg-indigo-50 text-indigo-700 border-indigo-100" },
                          { name: "Roshan Silva", service: "Hair Styling & Dye", time: "12:00 PM", active: false, tag: "Reminder Pending", tagColor: "bg-slate-100 text-slate-600 border-slate-200" },
                        ].map((a, idx) => (
                          <div
                            key={idx}
                            className="p-3.5 rounded-2xl border transition-all duration-300 flex items-center justify-between group bg-slate-50/50 border-slate-100 hover:border-slate-200"
                            style={{
                              background: a.active ? "rgba(46,134,193,0.03)" : "",
                              borderColor: a.active ? "rgba(46,134,193,0.15)" : "",
                            }}
                          >
                            <div className="space-y-1">
                              <div className="flex items-center gap-2">
                                <span className="text-xs font-black text-slate-800">{a.name}</span>
                                <span className={`text-[8px] font-black uppercase px-2 py-0.5 rounded-md border ${a.tagColor}`}>{a.tag}</span>
                              </div>
                              <p className="text-[10px] text-slate-500 font-medium">{a.service}</p>
                            </div>
                            <span className="text-[10px] font-black text-blue-600 bg-blue-50/50 border border-blue-100/50 px-2.5 py-1 rounded-xl">
                              {a.time}
                            </span>
                          </div>
                        ))}
                      </div>

                      {/* Right Column: Metrics & Invoicing (5 cols) */}
                      <div className="md:col-span-5 space-y-4">
                        {/* Revenue Widget */}
                        <div className="p-4 bg-slate-50/50 border border-slate-100 rounded-2xl space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Monthly Revenue</span>
                            <span className="text-[9px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md">▲ +24%</span>
                          </div>
                          <div className="font-display text-lg font-extrabold text-slate-800 leading-none">LKR 485,200</div>
                          
                          {/* Mini Bar Chart */}
                          <div className="flex items-end gap-1 mt-3 h-8">
                            {[30, 45, 60, 50, 85, 70, 100].map((h, i) => (
                              <div
                                key={i}
                                className="flex-1 rounded-t-sm"
                                style={{
                                  height: `${h}%`,
                                  background: i === 6 ? "var(--blue)" : "var(--sky-3)",
                                }}
                              />
                            ))}
                          </div>
                        </div>

                        {/* Checkout LankaQR Card */}
                        <div className="p-4 bg-gradient-to-br from-blue-600 to-indigo-950 text-white rounded-2xl space-y-3.5 shadow-md shadow-blue-500/10">
                          <div className="flex items-center justify-between">
                            <span className="text-[8px] font-black uppercase tracking-wider opacity-85">POS Checkout</span>
                            <QrCode size={12} className="opacity-90" />
                          </div>
                          <div>
                            <span className="text-[9px] opacity-70">Total Billed</span>
                            <div className="font-display text-base font-extrabold leading-none mt-0.5">LKR 12,500</div>
                          </div>
                          <div className="flex items-center justify-between pt-2 border-t border-white/10 text-[9px]">
                            <span className="opacity-60">Invoice Status</span>
                            <span className="bg-emerald-500/20 text-emerald-300 font-bold px-2 py-0.5 rounded-full border border-emerald-500/20">
                              Paid via LankaQR ✓
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                ) : (
                  <motion.div
                    key="booking"
                    initial={{ opacity: 0, scale: 0.96, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.96, y: -20 }}
                    transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
                    whileHover={{ y: -4, rotateY: -2, rotateX: 1, scale: 1.01 }}
                    style={{
                      transformStyle: "preserve-3d",
                      perspective: 1000,
                    }}
                    className="w-full bg-white border border-slate-200/80 rounded-[2.2rem] shadow-2xl p-6 relative overflow-hidden backdrop-blur-xl"
                  >
                    {/* Booking Portal App Bar */}
                    <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-4">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-full bg-emerald-50 text-emerald-700 flex items-center justify-center font-bold text-sm">
                          <Scissors size={14} />
                        </div>
                        <div>
                          <h3 className="text-xs font-black text-slate-800 leading-none">Glamour Studio</h3>
                          <span className="text-[9px] font-bold text-slate-400">Colombo 07 · Verified Partner</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Star size={10} className="fill-amber-400 stroke-amber-400" />
                        <span className="text-[10px] font-black text-slate-800">4.9</span>
                        <span className="text-[9px] font-bold text-slate-400">(128 reviews)</span>
                      </div>
                    </div>

                    {/* Stepper Wizard */}
                    <div className="flex items-center justify-between mb-4 bg-slate-50 p-2.5 rounded-2xl border border-slate-100">
                      {[
                        { step: 1, label: "Services", active: true },
                        { step: 2, label: "Specialist", active: false },
                        { step: 3, label: "Time", active: false },
                        { step: 4, label: "Confirm", active: false },
                      ].map((s) => (
                        <div key={s.step} className="flex items-center gap-1.5">
                          <div
                            className={`w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-black ${
                              s.active
                                ? "bg-blue-600 text-white shadow-md shadow-blue-500/20"
                                : "bg-slate-200 text-slate-600"
                            }`}
                          >
                            {s.step}
                          </div>
                          <span className={`text-[9px] font-bold ${s.active ? "text-slate-800" : "text-slate-400"}`}>
                            {s.label}
                          </span>
                        </div>
                      ))}
                    </div>

                    {/* Step Content: Service List Selection */}
                    <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                      {/* Left: Service Selection (7 cols) */}
                      <div className="md:col-span-7 space-y-2">
                        <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest pb-1">
                          Popular Services
                        </div>
                        {[
                          { id: 1, name: "Hair Cut & Styling", price: "LKR 2,500", duration: "45 mins", desc: "Consultation, premium wash, custom cut & professional blow-dry.", selected: true },
                          { id: 2, name: "Keratin Treatment", price: "LKR 12,000", duration: "120 mins", desc: "Long-lasting deep smoothing treatment to eliminate frizz.", selected: false },
                        ].map((srv) => (
                          <div
                            key={srv.id}
                            className={`p-3 rounded-2xl border transition-all duration-300 cursor-pointer ${
                              srv.selected
                                ? "bg-blue-50/50 border-blue-500/30 shadow-sm"
                                : "bg-white border-slate-100 hover:border-slate-200"
                            }`}
                          >
                            <div className="flex justify-between items-start">
                              <div>
                                <h4 className="text-xs font-black text-slate-800">{srv.name}</h4>
                                <span className="text-[9px] font-semibold text-slate-400">{srv.duration}</span>
                              </div>
                              <span className="text-xs font-black text-blue-600">{srv.price}</span>
                            </div>
                            <p className="text-[9px] text-slate-500 mt-1 line-clamp-1">{srv.desc}</p>
                          </div>
                        ))}
                      </div>

                      {/* Right: Booking Summary & Details (5 cols) */}
                      <div className="md:col-span-5 space-y-3.5">
                        <div className="p-3.5 bg-slate-50 border border-slate-100 rounded-2xl space-y-3">
                          <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest block">
                            Booking Summary
                          </span>
                          <div className="space-y-2">
                            <div className="flex justify-between text-[10px] font-bold text-slate-700">
                              <span>Hair Cut & Styling</span>
                              <span>LKR 2,500</span>
                            </div>
                            <div className="flex justify-between text-[10px] text-slate-400">
                              <span>GST / Tax (0%)</span>
                              <span>LKR 0</span>
                            </div>
                            <div className="flex justify-between text-[11px] font-black text-slate-800 pt-1.5 border-t border-slate-200/60">
                              <span>Total Price</span>
                              <span className="text-blue-600">LKR 2,500</span>
                            </div>
                          </div>
                        </div>

                        <button className="w-full py-2.5 bg-gradient-to-r from-blue-600 to-indigo-500 text-white font-black text-[10px] rounded-xl shadow-md shadow-blue-500/10 hover:opacity-95 transition-opacity flex items-center justify-center gap-1.5 uppercase tracking-wide">
                          <span>Continue to Details</span>
                          <ArrowRight size={10} className="stroke-[2.5]" />
                        </button>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </motion.div>
      </section>

      {/* ── MARQUEE ────────────────────────────────────────── */}
      <div
        className="relative overflow-hidden"
        style={{
          background: "var(--sky-2)",
          borderTop: "1px solid var(--border)",
          borderBottom: "1px solid var(--border)",
          zIndex: 1,
        }}
      >
        {/* Top: scrolling salon names */}
        <div
          className="py-5 overflow-hidden"
          style={{ borderBottom: "1px solid var(--border)" }}
        >
          <div
            className="absolute left-0 inset-y-0 w-28 z-10 pointer-events-none"
            style={{
              background: `linear-gradient(90deg, var(--sky-2), transparent)`,
            }}
          />
          <div
            className="absolute right-0 inset-y-0 w-28 z-10 pointer-events-none"
            style={{
              background: `linear-gradient(-90deg, var(--sky-2), transparent)`,
            }}
          />
          <div className="marquee-track items-center gap-0">
            {[...Array(2)]
              .flatMap(() => [
                { name: "Glamour Studio", city: "Colombo 07" },
                { name: "Serenity Spa & Salon", city: "Kandy" },
                { name: "Bliss Beauty Bar", city: "Nugegoda" },
                { name: "The Style Loft", city: "Galle" },
                { name: "Luxe Hair Atelier", city: "Rajagiriya" },
                { name: "Éclat Salon", city: "Battaramulla" },
                { name: "Velvet Touch Studio", city: "Dehiwala" },
                { name: "Prestige Beauty Lounge", city: "Negombo" },
              ])
              .map((salon, i) => (
                <div key={i} className="shrink-0 flex items-center">
                  <div className="flex items-center gap-2.5 px-8 py-1">
                    <span
                      style={{
                        width: 6,
                        height: 6,
                        borderRadius: "50%",
                        background:
                          i % 3 === 0
                            ? "var(--blue-light)"
                            : i % 3 === 1
                              ? "var(--sage-light)"
                              : "var(--ink-faint)",
                        display: "inline-block",
                        flexShrink: 0,
                      }}
                    />
                    <span
                      style={{
                        fontFamily: "Sora",
                        fontSize: 14,
                        fontWeight: 600,
                        color: "var(--ink-light)",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {salon.name}
                    </span>
                    <span
                      style={{
                        fontSize: 12,
                        color: "var(--ink-faint)",
                        fontWeight: 500,
                      }}
                    >
                      {salon.city}
                    </span>
                  </div>
                  <div
                    style={{
                      width: 1,
                      height: 18,
                      background: "var(--border)",
                      flexShrink: 0,
                    }}
                  />
                </div>
              ))}
          </div>
        </div>

        {/* Bottom: key stats */}
        <div className="max-w-7xl mx-auto px-6 sm:px-10 py-6">
          <div className="flex flex-wrap items-center justify-between gap-6">
            <p
              style={{
                color: "var(--ink-muted)",
                fontSize: 10,
                fontWeight: 700,
                letterSpacing: "0.14em",
              }}
            >
              TRUSTED BY THE FINEST SALONS ACROSS SRI LANKA
            </p>
            <div className="flex flex-wrap items-center gap-8">
              {[
                { val: "100+", label: "Active salons" },
                { val: "98%", label: "Retention rate" },
                { val: "50,000+", label: "Appointments booked" },
                { val: "LKR 10M+", label: "Revenue processed" },
              ].map(({ val, label }) => (
                <div key={label} className="flex items-center gap-2.5">
                  <span
                    style={{
                      fontFamily: "Sora",
                      fontSize: 16,
                      fontWeight: 700,
                      color: "var(--blue)",
                    }}
                  >
                    {val}
                  </span>
                  <span
                    style={{
                      fontSize: 12,
                      color: "var(--ink-muted)",
                      fontWeight: 500,
                    }}
                  >
                    {label}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ── THE PROBLEM ──────────────────────────────────────── */}
      <section className="py-24 relative bg-white" style={{ zIndex: 1 }}>
        <div className="max-w-7xl mx-auto px-6 sm:px-10">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="mb-16 text-center"
          >
            <h2
              style={{
                fontFamily: "Sora",
                fontSize: "clamp(30px, 4vw, 44px)",
                fontWeight: 700,
                color: "var(--ink)",
                lineHeight: 1.2,
                letterSpacing: "-0.025em",
              }}
            >
              {t('problem.title1')} <br />
              <span style={{ color: "#E74C3C" }}>{t('problem.title2')}</span>
            </h2>
            <p className="mt-6 text-lg max-w-2xl mx-auto" style={{ color: "var(--ink-muted)" }}>
              {t('problem.subtitle')}
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* The Old Way */}
            <motion.div 
              initial={{ opacity: 0, x: -30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              className="p-8 sm:p-10 rounded-3xl"
              style={{ background: "#FEF2F2", border: "1px solid #FEE2E2" }}
            >
              <div className="flex items-center gap-3 mb-8">
                <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ background: "#FCA5A5", color: "#991B1B" }}>
                  <XCircle size={20} />
                </div>
                <h3 style={{ fontFamily: "Sora", fontSize: 22, fontWeight: 700, color: "#991B1B" }}>{t('problem.oldWay')}</h3>
              </div>
              
              <ul className="space-y-6">
                {[
                  t('problem.oldWay1'),
                  t('problem.oldWay2'),
                  t('problem.oldWay3'),
                  t('problem.oldWay4'),
                  t('problem.oldWay5')
                ].map((text, i) => (
                  <li key={i} className="flex items-start gap-4">
                    <XCircle size={20} className="mt-0.5 shrink-0" style={{ color: "#EF4444" }} />
                    <span style={{ color: "#7F1D1D", fontWeight: 500 }}>{text}</span>
                  </li>
                ))}
              </ul>
            </motion.div>

            {/* The SalonFlow Way */}
            <motion.div 
              initial={{ opacity: 0, x: 30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              className="p-8 sm:p-10 rounded-3xl relative overflow-hidden"
              style={{ background: "var(--sky-2)", border: "1px solid var(--border)", boxShadow: "var(--shadow-card)" }}
            >
              <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl" />
              <div className="flex items-center gap-3 mb-8 relative z-10">
                <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ background: "var(--blue)", color: "white" }}>
                  <CheckCircle2 size={20} />
                </div>
                <h3 style={{ fontFamily: "Sora", fontSize: 22, fontWeight: 700, color: "var(--ink)" }}>{t('problem.newWay')}</h3>
              </div>
              
              <ul className="space-y-6 relative z-10">
                {[
                  t('problem.newWay1'),
                  t('problem.newWay2'),
                  t('problem.newWay3'),
                  t('problem.newWay4'),
                  t('problem.newWay5')
                ].map((text, i) => (
                  <li key={i} className="flex items-start gap-4">
                    <CheckCircle2 size={20} className="mt-0.5 shrink-0" style={{ color: "var(--blue)" }} />
                    <span style={{ color: "var(--ink)", fontWeight: 500 }}>{text}</span>
                  </li>
                ))}
              </ul>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ── FEATURES ───────────────────────────────────────── */}
      <section id="features" className="py-32 relative" style={{ zIndex: 1 }}>
        <div className="max-w-7xl mx-auto px-6 sm:px-10">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="mb-20 text-center"
          >
            <div
              className="tag-badge mb-4 mx-auto"
              style={{
                background: "var(--blue-pale)",
                color: "var(--blue-deep)",
                border: "1px solid rgba(46,134,193,0.18)",
              }}
            >
              <Zap size={11} /> {t('features.badge')}
            </div>
            <h2
              style={{
                fontFamily: "Sora",
                fontSize: "clamp(34px, 5vw, 54px)",
                fontWeight: 700,
                color: "var(--ink)",
                lineHeight: 1.1,
                letterSpacing: "-0.025em",
              }}
            >
              {t('features.title1')}
              <br />
              <span style={{ color: "var(--blue)" }}>{t('features.title2')}</span>
            </h2>
          </motion.div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            {/* Tabs */}
            <div className="lg:col-span-4">
              {features.map((f, i) => (
                <div
                  key={i}
                  className={`feature-pill px-6 py-4 mb-1 ${activeFeature === i ? "active" : ""}`}
                  onClick={() => setActiveFeature(i)}
                >
                  <div className="flex items-center gap-3 mb-1">
                    <div
                      className="w-8 h-8 rounded-xl flex items-center justify-center"
                      style={{
                        background:
                          activeFeature === i
                            ? "var(--blue-pale)"
                            : "var(--sky-3)",
                      }}
                    >
                      <f.icon
                        size={15}
                        style={{
                          color:
                            activeFeature === i
                              ? "var(--blue)"
                              : "var(--ink-muted)",
                        }}
                      />
                    </div>
                    <span
                      style={{
                        color:
                          activeFeature === i
                            ? "var(--ink)"
                            : "var(--ink-light)",
                        fontSize: 14,
                        fontWeight: 700,
                      }}
                    >
                      {f.title}
                    </span>
                  </div>
                  {activeFeature === i && (
                    <motion.p
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      style={{
                        color: "var(--ink-muted)",
                        fontSize: 13,
                        lineHeight: 1.6,
                        paddingLeft: 44,
                      }}
                    >
                      {f.desc}
                    </motion.p>
                  )}
                </div>
              ))}
            </div>

            {/* Panel */}
            <div className="lg:col-span-8">
              <AnimatePresence mode="wait">
                <motion.div
                  key={activeFeature}
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -12 }}
                  transition={{ duration: 0.28 }}
                  className="rounded-3xl p-8"
                  style={{
                    background: "rgba(255,255,255,0.92)",
                    border: "1px solid var(--border)",
                    boxShadow: "var(--shadow-card)",
                    minHeight: 360,
                  }}
                >
                  {activeFeature === 0 && (
                    <div>
                      <div
                        style={{
                          color: "var(--ink-muted)",
                          fontSize: 10,
                          fontWeight: 700,
                          letterSpacing: "0.12em",
                          marginBottom: 20,
                        }}
                      >
                        VISUAL APPOINTMENT TIMELINE
                      </div>
                      <div className="space-y-3">
                        {[
                          {
                            init: "SP",
                            name: "Sanduni P.",
                            service: "Keratin Treatment",
                            time: "09:00–10:30",
                            active: false,
                          },
                          {
                            init: "DR",
                            name: "Dilini R.",
                            service: "Balayage Color",
                            time: "10:30–12:00",
                            active: true,
                          },
                          {
                            init: "TM",
                            name: "Thilini M.",
                            service: "Bridal Makeup",
                            time: "12:00–13:30",
                            active: false,
                          },
                          {
                            init: "DR",
                            name: "Dilini R.",
                            service: "Walk-In Trim",
                            time: "14:00–15:00",
                            active: false,
                          },
                        ].map((row, i) => (
                          <div
                            key={i}
                            className="flex items-center justify-between p-4 rounded-2xl"
                            style={{
                              background: row.active
                                ? "var(--blue-pale)"
                                : "var(--sky-2)",
                              border: `1px solid ${row.active ? "rgba(46,134,193,0.18)" : "var(--border)"}`,
                            }}
                          >
                            <div className="flex items-center gap-3">
                              <div
                                className="w-9 h-9 rounded-full flex items-center justify-center"
                                style={{
                                  background: row.active
                                    ? "var(--blue)"
                                    : "var(--sky-3)",
                                  color: row.active
                                    ? "white"
                                    : "var(--ink-muted)",
                                  fontSize: 11,
                                  fontWeight: 700,
                                }}
                              >
                                {row.init}
                              </div>
                              <div>
                                <div
                                  style={{
                                    color: "var(--ink)",
                                    fontSize: 13,
                                    fontWeight: 700,
                                  }}
                                >
                                  {row.name}
                                </div>
                                <div
                                  style={{
                                    color: "var(--ink-muted)",
                                    fontSize: 11,
                                  }}
                                >
                                  {row.service}
                                </div>
                              </div>
                            </div>
                            <span
                              style={{
                                color: row.active
                                  ? "var(--blue)"
                                  : "var(--ink-muted)",
                                fontSize: 11,
                                fontWeight: 700,
                                background: row.active
                                  ? "rgba(46,134,193,0.1)"
                                  : "rgba(15,33,51,0.06)",
                                padding: "4px 12px",
                                borderRadius: 20,
                              }}
                            >
                              {row.time}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {activeFeature === 1 && (
                    <div>
                      <div
                        style={{
                          color: "var(--ink-muted)",
                          fontSize: 10,
                          fontWeight: 700,
                          letterSpacing: "0.12em",
                          marginBottom: 20,
                        }}
                      >
                        LANKAQR CHECKOUT REGISTER
                      </div>
                      <div className="grid grid-cols-2 gap-3 mb-5">
                        {[
                          ["Hair Cut & Styling", "LKR 2,500"],
                          ["Bridal Makeup", "LKR 8,000"],
                        ].map(([s, p]) => (
                          <div
                            key={s}
                            className="p-4 rounded-xl flex flex-col gap-1"
                            style={{
                              background: "var(--sky-2)",
                              border: "1px solid var(--border)",
                            }}
                          >
                            <span
                              style={{
                                color: "var(--ink-muted)",
                                fontSize: 12,
                              }}
                            >
                              {s}
                            </span>
                            <span
                              style={{
                                color: "var(--ink)",
                                fontSize: 15,
                                fontWeight: 700,
                              }}
                            >
                              {p}
                            </span>
                          </div>
                        ))}
                      </div>
                      <div
                        className="p-5 rounded-2xl"
                        style={{
                          background: "var(--blue-pale)",
                          border: "1px solid rgba(46,134,193,0.18)",
                        }}
                      >
                        <div className="flex justify-between items-center mb-4">
                          <span
                            style={{ color: "var(--ink-light)", fontSize: 14 }}
                          >
                            Total
                          </span>
                          <span
                            style={{
                              fontFamily: "Sora",
                              fontSize: 26,
                              fontWeight: 700,
                              color: "var(--blue)",
                            }}
                          >
                            LKR 10,500
                          </span>
                        </div>
                        <div className="flex gap-2">
                          {["Cash", "Card", "LankaQR"].map((m) => (
                            <button
                              key={m}
                              onClick={() => setSelectedPayMethod(m)}
                              className="flex-1 py-2.5 rounded-xl text-xs font-bold transition-all"
                              style={{
                                background:
                                  selectedPayMethod === m
                                    ? "var(--blue)"
                                    : "white",
                                color:
                                  selectedPayMethod === m
                                    ? "white"
                                    : "var(--ink-light)",
                                border: `1px solid ${selectedPayMethod === m ? "var(--blue)" : "var(--border)"}`,
                              }}
                            >
                              {m}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}

                  {activeFeature === 2 && (
                    <div>
                      <div
                        style={{
                          color: "var(--ink-muted)",
                          fontSize: 10,
                          fontWeight: 700,
                          letterSpacing: "0.12em",
                          marginBottom: 20,
                        }}
                      >
                        CLIENT LOYALTY & CRM
                      </div>
                      <div
                        className="flex items-center gap-4 p-5 rounded-2xl mb-4"
                        style={{
                          background: "var(--sky-2)",
                          border: "1px solid var(--border)",
                        }}
                      >
                        <div
                          className="w-12 h-12 rounded-full flex items-center justify-center font-bold"
                          style={{
                            background: "var(--blue-pale)",
                            color: "var(--blue)",
                            fontSize: 14,
                          }}
                        >
                          NP
                        </div>
                        <div className="flex-1">
                          <div
                            style={{
                              color: "var(--ink)",
                              fontSize: 15,
                              fontWeight: 700,
                            }}
                          >
                            Nimali Perera
                          </div>
                          <div
                            style={{ color: "var(--ink-muted)", fontSize: 12 }}
                          >
                            VIP Customer · 24 Visits
                          </div>
                        </div>
                        <div className="text-right">
                          <div
                            style={{
                              fontFamily: "Sora",
                              fontSize: 24,
                              fontWeight: 700,
                              color: "var(--sage)",
                            }}
                          >
                            {demoPoints}
                          </div>
                          <div
                            style={{ color: "var(--ink-muted)", fontSize: 11 }}
                          >
                            Points
                          </div>
                        </div>
                      </div>
                      <button
                        onClick={() => setDemoPoints((p) => p + 25)}
                        className="w-full py-3.5 rounded-2xl font-bold text-sm transition-all hover:opacity-90"
                        style={{
                          background: "var(--sage-pale)",
                          color: "var(--sage-deep)",
                          border: "1px solid rgba(90,138,122,0.18)",
                        }}
                      >
                        + Add Visit (Earn 25 Points)
                      </button>
                    </div>
                  )}

                  {activeFeature === 3 && (
                    <div>
                      <div
                        style={{
                          color: "var(--ink-muted)",
                          fontSize: 10,
                          fontWeight: 700,
                          letterSpacing: "0.12em",
                          marginBottom: 20,
                        }}
                      >
                        STOCK INVENTORY ALERTS
                      </div>
                      <div className="space-y-3">
                        {[
                          {
                            name: "Keratin Treatment (1L)",
                            stock: demoStockAlert,
                            warn: true,
                          },
                          {
                            name: "Argan Oil Serum (500ml)",
                            stock: 12,
                            warn: false,
                          },
                          {
                            name: "Color Developer 30Vol",
                            stock: 5,
                            warn: false,
                          },
                        ].map((item, i) => (
                          <div
                            key={i}
                            className="flex items-center justify-between p-4 rounded-xl"
                            style={{
                              background: "var(--sky-2)",
                              border: `1px solid ${item.warn && item.stock <= 2 ? "rgba(46,134,193,0.22)" : "var(--border)"}`,
                            }}
                          >
                            <span
                              style={{
                                color: "var(--ink)",
                                fontSize: 13,
                                fontWeight: 600,
                              }}
                            >
                              {item.name}
                            </span>
                            <span
                              style={{
                                fontSize: 11,
                                fontWeight: 700,
                                padding: "4px 12px",
                                borderRadius: 20,
                                background:
                                  item.warn && item.stock === 0
                                    ? "#FEE2E2"
                                    : item.warn && item.stock <= 2
                                      ? "#FFF8E8"
                                      : "var(--sage-pale)",
                                color:
                                  item.warn && item.stock === 0
                                    ? "#EF4444"
                                    : item.warn && item.stock <= 2
                                      ? "#9A6D00"
                                      : "var(--sage-deep)",
                              }}
                            >
                              {item.stock === 0
                                ? "Out of Stock"
                                : `${item.stock} remaining`}
                            </span>
                          </div>
                        ))}
                      </div>
                      <button
                        onClick={() =>
                          setDemoStockAlert((p) => (p > 0 ? p - 1 : 3))
                        }
                        className="mt-4 w-full py-3 rounded-xl text-sm font-bold"
                        style={{
                          background: "var(--sky-2)",
                          color: "var(--ink-light)",
                          border: "1px solid var(--border)",
                        }}
                      >
                        Simulate Sale
                      </button>
                    </div>
                  )}

                  {activeFeature === 4 && (
                    <div>
                      <div
                        style={{
                          color: "var(--ink-muted)",
                          fontSize: 10,
                          fontWeight: 700,
                          letterSpacing: "0.12em",
                          marginBottom: 20,
                        }}
                      >
                        MULTI-BRANCH NETWORK DASHBOARD
                      </div>
                      <div className="grid grid-cols-3 gap-3 mb-5">
                        {["Colombo 07", "Kandy City", "Galle Fort"].map(
                          (b, i) => (
                            <div
                              key={b}
                              className="p-4 rounded-2xl text-center"
                              style={{
                                background:
                                  i === 0 ? "var(--blue-pale)" : "var(--sky-2)",
                                border: `1px solid ${i === 0 ? "rgba(46,134,193,0.18)" : "var(--border)"}`,
                              }}
                            >
                              <div
                                style={{
                                  color:
                                    i === 0
                                      ? "var(--blue)"
                                      : "var(--ink-light)",
                                  fontSize: 12,
                                  fontWeight: 700,
                                }}
                              >
                                {b}
                              </div>
                              <div
                                style={{
                                  color: "var(--ink-muted)",
                                  fontSize: 10,
                                  marginTop: 3,
                                }}
                              >
                                Active
                              </div>
                            </div>
                          ),
                        )}
                      </div>
                      <div
                        className="p-5 rounded-2xl"
                        style={{
                          background: "var(--sky-2)",
                          border: "1px solid var(--border)",
                        }}
                      >
                        <div
                          style={{
                            color: "var(--ink-muted)",
                            fontSize: 12,
                            marginBottom: 6,
                          }}
                        >
                          Combined Revenue Today
                        </div>
                        <div
                          style={{
                            fontFamily: "Sora",
                            fontSize: 30,
                            fontWeight: 700,
                            color: "var(--blue)",
                          }}
                        >
                          LKR 84,200
                        </div>
                      </div>
                    </div>
                  )}

                  {activeFeature === 5 && (
                    <div>
                      <div
                        style={{
                          color: "var(--ink-muted)",
                          fontSize: 10,
                          fontWeight: 700,
                          letterSpacing: "0.12em",
                          marginBottom: 20,
                        }}
                      >
                        STYLIST PERFORMANCE ANALYTICS
                      </div>
                      <div className="space-y-4">
                        {[
                          { name: "Sanduni P.", revenue: 48500, bar: 95 },
                          { name: "Dilini R.", revenue: 41200, bar: 82 },
                          { name: "Thilini M.", revenue: 33800, bar: 67 },
                          { name: "Chamari K.", revenue: 28100, bar: 56 },
                        ].map((s) => (
                          <div key={s.name} className="flex items-center gap-4">
                            <div
                              style={{
                                color: "var(--ink-light)",
                                fontSize: 12,
                                fontWeight: 700,
                                width: 76,
                                flexShrink: 0,
                              }}
                            >
                              {s.name}
                            </div>
                            <div
                              className="flex-1 h-2.5 rounded-full overflow-hidden"
                              style={{ background: "var(--sky-3)" }}
                            >
                              <motion.div
                                initial={{ width: 0 }}
                                whileInView={{ width: `${s.bar}%` }}
                                viewport={{ once: true }}
                                transition={{ duration: 0.9, delay: 0.1 }}
                                className="h-full rounded-full"
                                style={{
                                  background: `linear-gradient(90deg, var(--blue), var(--blue-light))`,
                                }}
                              />
                            </div>
                            <div
                              style={{
                                color: "var(--ink)",
                                fontSize: 12,
                                fontWeight: 700,
                                width: 72,
                                textAlign: "right",
                                flexShrink: 0,
                              }}
                            >
                              LKR {(s.revenue / 1000).toFixed(1)}k
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {activeFeature === 6 && (
                    <div>
                      <div
                        style={{
                          color: "var(--ink-muted)",
                          fontSize: 10,
                          fontWeight: 700,
                          letterSpacing: "0.12em",
                          marginBottom: 20,
                        }}
                      >
                        SMART CLIENT NOTIFICATIONS & CALENDAR SYNC
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Email Preview */}
                        <div className="p-5 bg-slate-50 border border-slate-200/80 rounded-2xl space-y-3.5 shadow-sm">
                          <div className="flex items-center justify-between border-b border-slate-200/60 pb-2">
                            <span className="text-[10px] font-bold text-indigo-600 uppercase tracking-wide">HTML Email Invite</span>
                            <span className="text-[9px] text-slate-400">Just now</span>
                          </div>
                          <div className="space-y-1">
                            <h4 className="text-xs font-bold text-slate-900">Booking Confirmed! 📅</h4>
                            <p className="text-[10px] text-slate-500 leading-relaxed">
                              Dear Customer, your appointment is confirmed at <strong>Glamour Studio</strong>.<br/>
                              Date: <strong>2026-05-28</strong> | Time: <strong>10:30 AM</strong>
                            </p>
                          </div>
                          <div className="flex flex-wrap gap-2 pt-1">
                            <div className="px-3 py-1.5 bg-indigo-600 text-white text-[9px] font-bold rounded-lg shadow-sm">
                              Add to Google Calendar
                            </div>
                            <div className="px-3 py-1.5 bg-slate-200 text-slate-700 text-[9px] font-bold rounded-lg">
                              Download .ics
                            </div>
                          </div>
                        </div>

                        {/* SMS Preview */}
                        <div className="p-5 bg-slate-50 border border-slate-200/80 rounded-2xl space-y-3.5 shadow-sm">
                          <div className="flex items-center justify-between border-b border-slate-200/60 pb-2">
                            <span className="text-[10px] font-bold text-indigo-600 uppercase tracking-wide">SMS Text Gateway</span>
                            <span className="text-[9px] text-slate-400">text.lk</span>
                          </div>
                          <div className="p-3 bg-white border border-slate-100 rounded-xl shadow-inner">
                            <p className="text-[10px] text-slate-700 leading-relaxed font-semibold">
                              Hi Nimali, your booking at Glamour Studio is approved. Date: 2026-05-28 at 10:30 AM. See you soon! ✨
                            </p>
                          </div>
                          <div className="flex items-center gap-1.5 text-[9px] font-bold text-emerald-600">
                            <Check size={11} className="stroke-[3]" />
                            <span>Delivered successfully</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </motion.div>
              </AnimatePresence>
            </div>
          </div>
        </div>
      </section>

      {/* ── LIVE DEMO ──────────────────────────────────────── */}
      <section
        id="live-demo"
        className="py-32 relative stripe-sky"
        style={{
          background: "var(--sky-2)",
          borderTop: "1px solid var(--border)",
          borderBottom: "1px solid var(--border)",
          zIndex: 1,
        }}
      >
        <div className="max-w-7xl mx-auto px-6 sm:px-10">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="mb-16"
          >
            <div
              className="tag-badge mb-4"
              style={{
                background: "var(--sage-pale)",
                color: "var(--sage-deep)",
                border: "1px solid rgba(90,138,122,0.18)",
              }}
            >
              <Smartphone size={11} /> Interactive Workspace
            </div>
            <h2
              style={{
                fontFamily: "Sora",
                fontSize: "clamp(32px, 5vw, 50px)",
                fontWeight: 700,
                color: "var(--ink)",
                lineHeight: 1.1,
                letterSpacing: "-0.025em",
              }}
            >
              Experience the
              <br />
              <span style={{ color: "var(--blue)" }}>booking flow.</span>
            </h2>
          </motion.div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            {/* Controls */}
            <div
              className="lg:col-span-7 rounded-3xl p-8 space-y-8"
              style={{
                background: "rgba(255,255,255,0.92)",
                border: "1px solid var(--border)",
                boxShadow: "var(--shadow-card)",
              }}
            >
              {[
                {
                  label: "1. SELECT SERVICE",
                  options: [
                    "Hair Cut & Styling",
                    "Bridal Dressing",
                    "Keratin Treatment",
                    "Nail Gel Art",
                  ],
                  val: simService,
                  setter: (v: string) => {
                    setSimService(v);
                    setSimNotificationSent(false);
                  },
                },
                {
                  label: "2. ASSIGN STYLIST",
                  options: [
                    "Sanduni Perera",
                    "Dilini Ranasinghe",
                    "Thilini Mendis",
                  ],
                  val: simStaff,
                  setter: (v: string) => {
                    setSimStaff(v);
                    setSimNotificationSent(false);
                  },
                },
                {
                  label: "3. TIME SLOT",
                  options: ["09:00 AM", "10:30 AM", "01:00 PM", "04:30 PM"],
                  val: simTime,
                  setter: (v: string) => {
                    setSimTime(v);
                    setSimNotificationSent(false);
                  },
                },
              ].map((g) => (
                <div key={g.label}>
                  <div
                    style={{
                      color: "var(--ink-muted)",
                      fontSize: 10,
                      fontWeight: 700,
                      letterSpacing: "0.12em",
                      marginBottom: 12,
                    }}
                  >
                    {g.label}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {g.options.map((opt) => (
                      <button
                        key={opt}
                        onClick={() => g.setter(opt)}
                        className="px-4 py-2.5 rounded-full text-xs font-bold transition-all"
                        style={{
                          background:
                            g.val === opt ? "var(--blue)" : "var(--sky-2)",
                          color: g.val === opt ? "white" : "var(--ink-light)",
                          border: `1px solid ${g.val === opt ? "var(--blue)" : "var(--border)"}`,
                          boxShadow:
                            g.val === opt
                              ? "0 4px 12px rgba(46,134,193,0.28)"
                              : "none",
                        }}
                      >
                        {opt}
                      </button>
                    ))}
                  </div>
                </div>
              ))}

              <button
                onClick={handleSimulateBook}
                disabled={simLoading}
                className="btn-primary w-full h-14 rounded-2xl font-bold text-sm flex items-center justify-center gap-2.5 disabled:opacity-60"
              >
                {simLoading ? (
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <Smartphone size={16} /> Confirm & Send SMS Notification
                  </>
                )}
              </button>
            </div>

            {/* Phone mockup */}
            <div className="lg:col-span-5 flex items-start justify-center">
              <div
                className="w-[272px] rounded-[40px] p-3.5"
                style={{
                  background: "#E8EFF5",
                  border: "2px solid #D4E3EE",
                  boxShadow:
                    "0 40px 80px rgba(46,134,193,0.15), 0 8px 24px rgba(15,33,51,0.07)",
                }}
              >
                <div
                  className="rounded-[30px] overflow-hidden"
                  style={{ background: "#F7FAFC", minHeight: 480 }}
                >
                  <div
                    className="flex justify-between px-5 pt-4 pb-2"
                    style={{
                      fontSize: 10,
                      color: "var(--ink-muted)",
                      fontWeight: 700,
                    }}
                  >
                    <span>9:41</span>
                    <div className="flex gap-1 items-center">
                      <span>LTE</span>
                      <div
                        className="w-4 h-2.5 rounded-sm"
                        style={{ background: "var(--sky-3)" }}
                      />
                    </div>
                  </div>
                  <div
                    className="mx-auto w-24 h-5 rounded-b-full mb-4"
                    style={{ background: "#E8EFF5" }}
                  />

                  <div className="px-5 py-2 min-h-[340px] flex flex-col justify-center">
                    <AnimatePresence mode="wait">
                      {simNotificationSent ? (
                        <motion.div
                          key="sent"
                          initial={{ opacity: 0, scale: 0.9, y: 16 }}
                          animate={{ opacity: 1, scale: 1, y: 0 }}
                          exit={{ opacity: 0 }}
                          className="rounded-2xl overflow-hidden"
                          style={{
                            background: "white",
                            border: "1px solid var(--border)",
                            boxShadow: "var(--shadow-soft)",
                          }}
                        >
                          <div
                            className="flex items-center gap-2 px-4 pt-4 pb-3"
                            style={{ borderBottom: "1px solid var(--border)" }}
                          >
                            <div
                              className="w-6 h-6 rounded-full flex items-center justify-center"
                              style={{ background: "var(--blue-pale)" }}
                            >
                              <MessageSquare
                                size={11}
                                style={{ color: "var(--blue)" }}
                              />
                            </div>
                            <span
                              style={{
                                color: "var(--blue)",
                                fontSize: 9,
                                fontWeight: 700,
                                letterSpacing: "0.1em",
                              }}
                            >
                              SMS NOTIFICATION
                            </span>
                            <span
                              style={{
                                color: "var(--ink-muted)",
                                fontSize: 9,
                                marginLeft: "auto",
                              }}
                            >
                              Just now
                            </span>
                          </div>
                          <div className="p-4">
                            <p
                              style={{
                                color: "var(--ink-light)",
                                fontSize: 11,
                                lineHeight: 1.7,
                              }}
                            >
                              Hi Nimali, your booking for{" "}
                              <strong style={{ color: "var(--ink)" }}>
                                {simService}
                              </strong>{" "}
                              with{" "}
                              <strong style={{ color: "var(--ink)" }}>
                                {simStaff}
                              </strong>{" "}
                              at {simTime} is confirmed. See you at Glamour
                              Studio! ✨
                            </p>
                            <div
                              className="flex items-center gap-1.5 mt-4"
                              style={{
                                color: "var(--sage)",
                                fontSize: 10,
                                fontWeight: 700,
                              }}
                            >
                              <Check size={11} className="check-pop" />
                              <span>Delivered successfully</span>
                            </div>
                          </div>
                        </motion.div>
                      ) : (
                        <motion.div
                          key="waiting"
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          className="flex flex-col items-center gap-3 text-center py-12"
                        >
                          <MessageSquare
                            size={30}
                            style={{ color: "var(--ink-faint)" }}
                          />
                          <p
                            style={{
                              color: "var(--ink-faint)",
                              fontSize: 12,
                              lineHeight: 1.6,
                            }}
                          >
                            Configure your appointment above and confirm to send
                            the SMS
                          </p>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>

                  <div
                    className="w-20 h-1.5 rounded-full mx-auto mb-4"
                    style={{ background: "var(--sky-3)" }}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── TESTIMONIALS ──────────────────────────────────────── */}
      <section className="py-24 relative bg-white" style={{ zIndex: 1 }}>
        <div className="max-w-7xl mx-auto px-6 sm:px-10">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <div
              className="tag-badge mb-4 mx-auto"
              style={{
                background: "#FCE7F3",
                color: "#BE185D",
                border: "1px solid rgba(244,114,182,0.3)",
              }}
            >
              <Heart size={11} fill="currentColor" /> {t('testimonials.badge')}
            </div>
            <h2
              style={{
                fontFamily: "Sora",
                fontSize: "clamp(30px, 4vw, 44px)",
                fontWeight: 700,
                color: "var(--ink)",
                lineHeight: 1.2,
                letterSpacing: "-0.025em",
              }}
            >
              {t('testimonials.title')}
            </h2>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[1, 2, 3].map((num, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.15 }}
                className="p-8 rounded-3xl flex flex-col justify-between"
                style={{
                  background: "var(--sky-2)",
                  border: "1px solid var(--border)",
                  boxShadow: "0 4px 20px rgba(0,0,0,0.02)",
                }}
              >
                <div>
                  <div className="flex gap-1 mb-6 text-yellow-400">
                    <Star size={16} fill="currentColor" />
                    <Star size={16} fill="currentColor" />
                    <Star size={16} fill="currentColor" />
                    <Star size={16} fill="currentColor" />
                    <Star size={16} fill="currentColor" />
                  </div>
                  <p
                    style={{
                      color: "var(--ink-light)",
                      fontSize: 16,
                      lineHeight: 1.7,
                      fontStyle: "italic",
                      marginBottom: 30,
                    }}
                  >
                    {t(`testimonials.review${num}`)}
                  </p>
                </div>
                <div className="flex items-center gap-4 pt-6" style={{ borderTop: "1px solid var(--border)" }}>
                  <div className="w-12 h-12 rounded-full bg-indigo-100 flex items-center justify-center font-bold text-indigo-700" style={{ fontFamily: "Sora" }}>
                    {t(`testimonials.author${num}`).charAt(0)}
                  </div>
                  <div>
                    <h4 style={{ color: "var(--ink)", fontWeight: 700, fontSize: 15 }}>
                      {t(`testimonials.author${num}`)}
                    </h4>
                    <p style={{ color: "var(--ink-muted)", fontSize: 13, fontWeight: 500 }}>
                      {t(`testimonials.role${num}`)}
                    </p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── PRICING ────────────────────────────────────────── */}
      <section id="pricing" className="py-32 relative" style={{ zIndex: 1 }}>
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              "radial-gradient(ellipse 80% 60% at 50% 50%, rgba(46,134,193,0.04) 0%, transparent 70%)",
          }}
        />

        <div className="max-w-7xl mx-auto px-6 sm:px-10">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-6"
          >
            <div
              className="tag-badge mb-4 mx-auto"
              style={{
                background: "var(--blue-pale)",
                color: "var(--blue-deep)",
                border: "1px solid rgba(46,134,193,0.18)",
              }}
            >
              <Star size={11} fill="currentColor" /> {t('pricing.badge')}
            </div>
            <h2
              style={{
                fontFamily: "Sora",
                fontSize: "clamp(36px, 5vw, 58px)",
                fontWeight: 700,
                color: "var(--ink)",
                lineHeight: 1.1,
                letterSpacing: "-0.025em",
              }}
            >
              {t('pricing.title1')}
              <br />
              <span style={{ color: "var(--blue)" }}>{t('pricing.title2')}</span>
            </h2>
            <p
              className="mt-4"
              style={{
                color: "var(--ink-muted)",
                fontSize: 16,
                fontWeight: 400,
              }}
            >
              Start free for 14 days. Upgrade, downgrade, or cancel anytime.
            </p>
          </motion.div>

          <div
            className="separator-ornament max-w-xs mx-auto mb-16"
            style={{ fontSize: 14 }}
          >
            ✦
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 max-w-5xl mx-auto items-start">
            {plans.map((plan, idx) => {
              const matchedId = plan.id;
              const isPopular = idx === 1;
              return (
                <motion.div
                  key={plan.id}
                  initial={{ opacity: 0, y: 40 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.55, delay: idx * 0.12 }}
                  className="relative flex flex-col"
                  style={{
                    borderRadius: 28,
                    background: isPopular
                      ? "linear-gradient(155deg, #1A5F8A 0%, #0F3D5C 55%, #0A2840 100%)"
                      : "rgba(255,255,255,0.92)",
                    border: isPopular
                      ? "none"
                      : "1px solid rgba(15,33,51,0.08)",
                    boxShadow: isPopular
                      ? "0 32px 80px rgba(15,33,51,0.2), 0 8px 24px rgba(46,134,193,0.15)"
                      : "var(--shadow-card)",
                    padding: isPopular ? "36px 28px" : "32px 28px",
                    marginTop: isPopular ? -12 : 0,
                  }}
                >
                  {isPopular && (
                    <div
                      className="absolute -top-5 left-1/2 -translate-x-1/2 flex items-center gap-1.5 px-5 py-2 rounded-full"
                      style={{
                        background:
                          "linear-gradient(135deg, #27AE8F 0%, #5DCAA5 100%)",
                        color: "#0A2A20",
                        fontSize: 10,
                        fontWeight: 800,
                        letterSpacing: "0.08em",
                        boxShadow: "0 6px 20px rgba(39,174,143,0.32)",
                        whiteSpace: "nowrap",
                      }}
                    >
                      <Star size={10} fill="currentColor" /> MOST POPULAR
                    </div>
                  )}

                  <div style={{ marginBottom: 20 }}>
                    <h3
                      style={{
                        fontFamily: "Sora",
                        fontSize: 20,
                        fontWeight: 700,
                        color: isPopular
                          ? "rgba(247,250,252,0.95)"
                          : "var(--ink)",
                      }}
                    >
                      {plan.display_name || plan.name}
                    </h3>
                    {plan.description && (
                    <p
                      style={{
                        color: isPopular
                          ? "rgba(247,250,252,0.45)"
                          : "var(--ink-muted)",
                        fontSize: 13,
                        marginTop: 6,
                        lineHeight: 1.5,
                      }}
                    >
                      {plan.description}
                    </p>
                    )}
                  </div>

                  <div
                    style={{
                      padding: "20px 0",
                      marginBottom: 20,
                      borderTop: `1px solid ${isPopular ? "rgba(255,255,255,0.08)" : "var(--border)"}`,
                      borderBottom: `1px solid ${isPopular ? "rgba(255,255,255,0.08)" : "var(--border)"}`,
                    }}
                  >
                    <div className="flex items-baseline gap-2">
                      <span
                        style={{
                          fontFamily: "Sora",
                          fontSize: 34,
                          fontWeight: 700,
                          color: isPopular ? "#7DD5BC" : "var(--blue)",
                          lineHeight: 1,
                        }}
                      >
                        {`LKR ${Number(plan.monthly_price || 0).toLocaleString()}`}
                      </span>
                      <span
                        style={{
                          color: isPopular
                            ? "rgba(247,250,252,0.4)"
                            : "var(--ink-muted)",
                          fontSize: 13,
                          fontWeight: 500,
                        }}
                      >
                        / month
                      </span>
                    </div>
                  </div>

                  <ul className="flex-1 space-y-3.5 mb-8">
                    {parseFeatures(plan.features).map((feat, fi) => (
                      <li key={fi} className="flex items-center gap-3">
                        <div
                          className="w-5 h-5 rounded-full flex items-center justify-center shrink-0"
                          style={{
                            background: isPopular
                              ? "rgba(125,213,188,0.15)"
                              : "var(--sage-pale)",
                          }}
                        >
                          <Check
                            size={10}
                            style={{
                              color: isPopular ? "#7DD5BC" : "var(--sage)",
                            }}
                          />
                        </div>
                        <span
                          style={{
                            color: isPopular
                              ? "rgba(247,250,252,0.75)"
                              : "var(--ink-light)",
                            fontSize: 13,
                            fontWeight: 500,
                          }}
                        >
                          {feat}
                        </span>
                      </li>
                    ))}
                  </ul>

                  <Link to={`/start-trial?planId=${matchedId}`}>
                    <button
                      className="w-full py-4 rounded-2xl font-bold text-sm transition-all hover:opacity-90 active:scale-[0.98]"
                      style={
                        isPopular
                          ? {
                              background:
                                "linear-gradient(135deg, #27AE8F 0%, #5DCAA5 100%)",
                              color: "#0A2A20",
                              boxShadow: "0 8px 24px rgba(39,174,143,0.3)",
                              fontSize: 14,
                            }
                          : {
                              background: "var(--blue-pale)",
                              color: "var(--blue)",
                              border: "1.5px solid rgba(46,134,193,0.2)",
                              fontSize: 14,
                            }
                      }
                    >
                      Start Free Trial
                    </button>
                  </Link>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── TRUST PILLARS ──────────────────────────────────── */}
      <section
        className="py-20"
        style={{
          background: "var(--sky-2)",
          borderTop: "1px solid var(--border)",
          zIndex: 1,
          position: "relative",
        }}
      >
        <div className="max-w-7xl mx-auto px-6 sm:px-10">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              {
                icon: Shield,
                title: "Secure Data Vault",
                desc: "Industry-standard encryption with automated cloud backups. Your client data is safe around the clock.",
              },
              {
                icon: Clock,
                title: "99.9% Uptime",
                desc: "Redundant enterprise server stacks, speed-optimized for fast loads on all devices across Sri Lanka.",
              },
              {
                icon: Scissors,
                title: "Commission Control",
                desc: "Automated calculations matching staff service profiles. Generate payroll in a single click.",
              },
            ].map(({ icon: Icon, title, desc }) => (
              <div key={title} className="card-airy p-8">
                <div
                  className="w-11 h-11 rounded-2xl flex items-center justify-center mb-5"
                  style={{ background: "var(--blue-pale)" }}
                >
                  <Icon size={20} style={{ color: "var(--blue)" }} />
                </div>
                <h3
                  style={{
                    color: "var(--ink)",
                    fontSize: 17,
                    fontWeight: 700,
                    marginBottom: 10,
                  }}
                >
                  {title}
                </h3>
                <p
                  style={{
                    color: "var(--ink-muted)",
                    fontSize: 14,
                    lineHeight: 1.7,
                  }}
                >
                  {desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CONTACT US ──────────────────────────────────────── */}
      <section
        id="contact"
        className="py-32 relative"
        style={{
          borderTop: "1px solid var(--border)",
          zIndex: 1,
        }}
      >
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              "radial-gradient(ellipse 60% 50% at 50% 50%, rgba(46,134,193,0.03) 0%, transparent 75%)",
          }}
        />

        <div className="max-w-7xl mx-auto px-6 sm:px-10">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <div
              className="tag-badge mb-4 mx-auto"
              style={{
                background: "var(--blue-pale)",
                color: "var(--blue-deep)",
                border: "1px solid rgba(46,134,193,0.18)",
              }}
            >
              <MessageSquare size={11} /> Have Questions?
            </div>
            <h2
              style={{
                fontFamily: "Sora",
                fontSize: "clamp(36px, 5vw, 58px)",
                fontWeight: 700,
                color: "var(--ink)",
                lineHeight: 1.1,
                letterSpacing: "-0.025em",
              }}
            >
              Get in Touch.
              <br />
              <span style={{ color: "var(--blue)" }}>We'd love to hear from you.</span>
            </h2>
            <p
              className="mt-4"
              style={{
                color: "var(--ink-muted)",
                fontSize: 16,
                fontWeight: 400,
              }}
            >
              Have questions about features, pricing, or custom options? Drop us a line.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-start max-w-6xl mx-auto">
            {/* Contact Details Column (5 cols) */}
            <div className="lg:col-span-5 space-y-8">
              <div
                className="rounded-3xl p-8 space-y-6"
                style={{
                  background: "rgba(255,255,255,0.7)",
                  backdropFilter: "blur(20px)",
                  border: "1px solid var(--border)",
                  boxShadow: "var(--shadow-card)",
                }}
              >
                <h3
                  style={{
                    fontFamily: "Sora",
                    fontSize: 20,
                    fontWeight: 700,
                    color: "var(--ink)",
                  }}
                >
                  Contact Information
                </h3>
                <p style={{ color: "var(--ink-light)", fontSize: 14, lineHeight: 1.6 }}>
                  Our team is ready to support your salon business growth. Reach out through any of these channels.
                </p>

                <div className="space-y-6 pt-2">
                  {[
                    {
                      icon: Smartphone,
                      title: "Call Us",
                      desc: "075 445 3334",
                      sub: "Mon - Sat, 9:00 AM - 6:00 PM"
                    },
                    {
                      icon: MessageSquare,
                      title: "Email Support",
                      desc: "info@salonflow.cloud",
                      sub: "24/7 client response desk"
                    },
                    {
                      icon: Shield,
                      title: "Corporate Office",
                      desc: "Panadura",
                      sub: "Sri Lanka"
                    }
                  ].map((item, idx) => (
                    <div key={idx} className="flex gap-4 items-start">
                      <div
                        className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                        style={{
                          background: "var(--blue-pale)",
                        }}
                      >
                        <item.icon size={16} style={{ color: "var(--blue)" }} />
                      </div>
                      <div>
                        <h4 style={{ color: "var(--ink)", fontSize: 13, fontWeight: 700 }}>
                          {item.title}
                        </h4>
                        <p style={{ color: "var(--ink-light)", fontSize: 14, fontWeight: 500 }}>
                          {item.desc}
                        </p>
                        <span style={{ color: "var(--ink-muted)", fontSize: 11 }}>
                          {item.sub}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Form Column (7 cols) */}
            <div className="lg:col-span-7">
              <form
                onSubmit={handleContactSubmit}
                className="rounded-3xl p-8 space-y-6"
                style={{
                  background: "rgba(255,255,255,0.92)",
                  border: "1px solid var(--border)",
                  boxShadow: "var(--shadow-card)",
                }}
              >
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div>
                    <label
                      style={{
                        color: "var(--ink-light)",
                        fontSize: 12,
                        fontWeight: 700,
                        display: "block",
                        marginBottom: 8,
                      }}
                    >
                      Full Name
                    </label>
                    <input
                      type="text"
                      value={contactName}
                      onChange={(e) => setContactName(e.target.value)}
                      placeholder="Sanduni Perera"
                      style={{
                        width: "100%",
                        height: 48,
                        borderRadius: 12,
                        border: "1px solid var(--border)",
                        background: "var(--sky-2)",
                        padding: "0 16px",
                        fontSize: 14,
                        color: "var(--ink)",
                      }}
                      className="focus:outline-none focus:border-[var(--blue)] transition-colors"
                    />
                  </div>
                  <div>
                    <label
                      style={{
                        color: "var(--ink-light)",
                        fontSize: 12,
                        fontWeight: 700,
                        display: "block",
                        marginBottom: 8,
                      }}
                    >
                      Email Address
                    </label>
                    <input
                      type="email"
                      value={contactEmail}
                      onChange={(e) => setContactEmail(e.target.value)}
                      placeholder="sanduni@example.com"
                      style={{
                        width: "100%",
                        height: 48,
                        borderRadius: 12,
                        border: "1px solid var(--border)",
                        background: "var(--sky-2)",
                        padding: "0 16px",
                        fontSize: 14,
                        color: "var(--ink)",
                      }}
                      className="focus:outline-none focus:border-[var(--blue)] transition-colors"
                    />
                  </div>
                </div>

                <div>
                  <label
                    style={{
                      color: "var(--ink-light)",
                      fontSize: 12,
                      fontWeight: 700,
                      display: "block",
                      marginBottom: 8,
                    }}
                  >
                    Topic of Interest
                  </label>
                  <select
                    value={contactSubject}
                    onChange={(e) => setContactSubject(e.target.value)}
                    style={{
                      width: "100%",
                      height: 48,
                      borderRadius: 12,
                      border: "1px solid var(--border)",
                      background: "var(--sky-2)",
                      padding: "0 16px",
                      fontSize: 14,
                      color: "var(--ink)",
                      appearance: "none",
                    }}
                    className="focus:outline-none focus:border-[var(--blue)] transition-colors"
                  >
                    <option value="General Inquiry">General Inquiry</option>
                    <option value="Demo Request">Demo Request</option>
                    <option value="Pricing & Plans">Pricing & Plans</option>
                    <option value="Technical Support">Technical Support</option>
                  </select>
                </div>

                <div>
                  <label
                    style={{
                      color: "var(--ink-light)",
                      fontSize: 12,
                      fontWeight: 700,
                      display: "block",
                      marginBottom: 8,
                    }}
                  >
                    Message
                  </label>
                  <textarea
                    rows={4}
                    value={contactMessage}
                    onChange={(e) => setContactMessage(e.target.value)}
                    placeholder="Tell us about your salon or how we can help you..."
                    style={{
                      width: "100%",
                      borderRadius: 12,
                      border: "1px solid var(--border)",
                      background: "var(--sky-2)",
                      padding: "16px",
                      fontSize: 14,
                      color: "var(--ink)",
                      resize: "none",
                    }}
                    className="focus:outline-none focus:border-[var(--blue)] transition-colors"
                  />
                </div>

                {contactError && (
                  <div
                    style={{
                      padding: "12px 16px",
                      background: "rgba(231,76,60,0.1)",
                      border: "1px solid rgba(231,76,60,0.2)",
                      borderRadius: 12,
                      color: "#E74C3C",
                      fontSize: 13,
                      fontWeight: 600,
                    }}
                  >
                    {contactError}
                  </div>
                )}

                {contactSuccess && (
                  <div
                    style={{
                      padding: "12px 16px",
                      background: "var(--sage-pale)",
                      border: "1px solid rgba(90,138,122,0.2)",
                      borderRadius: 12,
                      color: "var(--sage-deep)",
                      fontSize: 13,
                      fontWeight: 600,
                    }}
                  >
                    {contactSuccess}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={contactLoading}
                  className="btn-primary w-full h-14 rounded-2xl font-bold text-sm flex items-center justify-center gap-2.5 disabled:opacity-60 transition-all"
                >
                  {contactLoading ? (
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <>
                      <MessageSquare size={16} /> Send Message
                    </>
                  )}
                </button>
              </form>
            </div>
          </div>
        </div>
      </section>

      {/* ── CTA BANNER ─────────────────────────────────────── */}
      <section
        className="py-24 px-6"
        style={{ zIndex: 1, position: "relative" }}
      >
        <div className="max-w-5xl mx-auto">
          <div
            className="relative rounded-3xl overflow-hidden text-center"
            style={{
              background:
                "linear-gradient(135deg, #1A5F8A 0%, #0F3D5C 50%, #0A2840 100%)",
              padding: "80px 40px",
              boxShadow: "0 40px 100px rgba(15,33,51,0.18)",
            }}
          >
            <div
              className="absolute -top-16 -right-16 w-64 h-64 rounded-full pointer-events-none"
              style={{
                background:
                  "radial-gradient(circle, rgba(27,156,219,0.14) 0%, transparent 70%)",
              }}
            />
            <div
              className="absolute -bottom-16 -left-16 w-48 h-48 rounded-full pointer-events-none"
              style={{
                background:
                  "radial-gradient(circle, rgba(90,138,122,0.12) 0%, transparent 70%)",
              }}
            />

            <div className="relative max-w-2xl mx-auto">
              <div
                className="tag-badge mb-6 mx-auto"
                style={{
                  background: "rgba(27,156,219,0.12)",
                  color: "#7DD5BC",
                  border: "1px solid rgba(27,156,219,0.2)",
                }}
              >
                <Sparkles size={11} /> {t('footer.readyTitle')}
              </div>
              <h2
                style={{
                  fontFamily: "Sora",
                  fontSize: "clamp(32px, 5vw, 50px)",
                  fontWeight: 700,
                  color: "#F7FAFC",
                  lineHeight: 1.1,
                  letterSpacing: "-0.025em",
                  marginBottom: 20,
                }}
              >
                {t('footer.readyTitle')}
              </h2>
              <p
                style={{
                  color: "rgba(247,250,252,0.55)",
                  fontSize: 16,
                  lineHeight: 1.7,
                  marginBottom: 36,
                }}
              >
                {t('footer.readySubtitle')}
              </p>
              <div className="flex flex-wrap gap-3 justify-center">
                <Link to="/start-trial">
                  <button
                    className="btn-primary h-14 px-10 rounded-full font-bold flex items-center gap-2.5 transition-all"
                    style={{ fontSize: 15 }}
                  >
                    {t('footer.cta')} <ArrowRight size={16} />
                  </button>
                </Link>
                <Link to="/login">
                  <button
                    className="h-14 px-8 rounded-full font-bold flex items-center gap-2 transition-all"
                    style={{
                      fontSize: 15,
                      background: "rgba(255,255,255,0.07)",
                      border: "1.5px solid rgba(255,255,255,0.15)",
                      color: "rgba(247,250,252,0.8)",
                    }}
                  >
                    {t('nav.login')}
                  </button>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── FOOTER ─────────────────────────────────────────── */}
      <footer
        className="py-12"
        style={{
          borderTop: "1px solid var(--border)",
          background: "var(--sky-2)",
          zIndex: 1,
          position: "relative",
        }}
      >
        <div className="max-w-7xl mx-auto px-6 sm:px-10">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center">
              <img src={logoImg} alt="SalonFlow" className="h-14 md:h-16 object-contain" />
            </div>
            <div className="flex items-center gap-8">
              {[
                ["#features", t('nav.features')],
                ["#pricing", t('nav.pricing')],
                ["#contact", t('nav.contact')],
                ["/privacy-policy", "Privacy Policy"],
                ["/login", t('nav.login')],
              ].map(([href, label]) =>
                href.startsWith("/") ? (
                  <Link
                    key={label}
                    to={href}
                    style={{
                      color: "var(--ink-muted)",
                      fontSize: 13,
                      fontWeight: 600,
                    }}
                    className="hover:text-[var(--blue)] transition-colors"
                  >
                    {label}
                  </Link>
                ) : (
                  <a
                    key={label}
                    href={href}
                    style={{
                      color: "var(--ink-muted)",
                      fontSize: 13,
                      fontWeight: 600,
                    }}
                    className="hover:text-[var(--blue)] transition-colors"
                  >
                    {label}
                  </a>
                ),
              )}
            </div>
            <div
              style={{
                color: "var(--ink-muted)",
                fontSize: 12,
                fontWeight: 500,
              }}
            >
              © 2025 SalonFlow. All rights reserved.
            </div>
          </div>
        </div>
      </footer>
      </div>
    </>
  );
};

export default LandingPage;
