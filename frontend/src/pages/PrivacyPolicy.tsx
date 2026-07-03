import { Link } from "react-router-dom";
import { Shield, ArrowLeft, Lock, Eye, Database, Users, Mail, RefreshCw, Trash2, Globe } from "lucide-react";
import logoImg from "@/Assets/Logo.png";
import SEO from "@/components/SEO";

const sections = [
  {
    id: "information-we-collect",
    icon: Database,
    title: "Information We Collect",
    content: [
      {
        heading: "Account & Business Information",
        text: "When you register for SalonFlow, we collect your salon name, owner name, email address, phone number, and physical address. This information is required to create and manage your account.",
      },
      {
        heading: "Customer Data",
        text: "As part of operating your salon, you may input your clients' names, contact details, appointment history, and service preferences. You remain the data controller for this information — we process it only on your behalf.",
      },
      {
        heading: "Usage & Technical Data",
        text: "We automatically collect log data including your IP address, browser type, device information, pages visited, and actions taken within the platform. This helps us maintain and improve the service.",
      },
      {
        heading: "Payment Information",
        text: "We collect payment slip images and transaction references when you submit subscription payments. We do not store full credit card numbers or banking credentials.",
      },
    ],
  },
  {
    id: "how-we-use",
    icon: Eye,
    title: "How We Use Your Information",
    content: [
      {
        heading: "Service Delivery",
        text: "To provide, maintain, and improve the SalonFlow platform — including appointment scheduling, billing, staff management, inventory tracking, and reporting features.",
      },
      {
        heading: "Communications",
        text: "To send subscription invoices, payment confirmations, expiry reminders, and important service announcements to the email address associated with your account.",
      },
      {
        heading: "Support & Security",
        text: "To respond to support requests, investigate security incidents, enforce our Terms of Service, and comply with legal obligations.",
      },
      {
        heading: "Analytics & Improvement",
        text: "Aggregate, anonymised usage data helps us understand how the platform is used and prioritise new features. We never sell individual usage profiles.",
      },
    ],
  },
  {
    id: "data-storage",
    icon: Lock,
    title: "Data Storage & Security",
    content: [
      {
        heading: "Where Data Is Stored",
        text: "All data is stored on servers located in secure data centres. Your data is logically isolated from other tenants using our multi-tenant architecture.",
      },
      {
        heading: "Security Measures",
        text: "We use industry-standard measures including encrypted connections (HTTPS/TLS), hashed passwords (bcrypt), role-based access controls, and regular security reviews.",
      },
      {
        heading: "Backups",
        text: "We perform regular automated backups. In the event of a data loss incident we will notify affected customers within 72 hours and work to restore service as quickly as possible.",
      },
    ],
  },
  {
    id: "sharing",
    icon: Users,
    title: "Sharing of Information",
    content: [
      {
        heading: "We Do Not Sell Your Data",
        text: "SalonFlow does not sell, rent, or trade your personal information or your customers' data to any third parties for marketing or advertising purposes.",
      },
      {
        heading: "Service Providers",
        text: "We may share limited data with trusted sub-processors (such as email delivery services) strictly to operate the platform. These providers are bound by data processing agreements.",
      },
      {
        heading: "Legal Requirements",
        text: "We may disclose information if required to do so by law, court order, or a governmental authority, or to protect the rights, property, or safety of SalonFlow or its users.",
      },
    ],
  },
  {
    id: "cookies",
    icon: Globe,
    title: "Cookies & Local Storage",
    content: [
      {
        heading: "Essential Cookies",
        text: "We use cookies and browser localStorage to maintain your login session and remember your preferences. These are strictly necessary for the platform to function and cannot be disabled.",
      },
      {
        heading: "No Tracking Cookies",
        text: "We do not use third-party advertising or cross-site tracking cookies. We do not integrate third-party analytics services that profile individual users.",
      },
    ],
  },
  {
    id: "your-rights",
    icon: Shield,
    title: "Your Rights",
    content: [
      {
        heading: "Access & Portability",
        text: "You may request a copy of the personal data we hold about your account at any time by contacting us at the email below.",
      },
      {
        heading: "Correction",
        text: "You can update most of your account information directly from your dashboard Settings page. For other corrections, contact our support team.",
      },
      {
        heading: "Deletion",
        text: "You may request deletion of your account and associated data. Upon account termination, we will delete or anonymise your data within 30 days, except where retention is required by law.",
      },
      {
        heading: "Objection",
        text: "You may object to the processing of your data for direct communications at any time by emailing us or using the unsubscribe link in any email we send.",
      },
    ],
  },
  {
    id: "retention",
    icon: RefreshCw,
    title: "Data Retention",
    content: [
      {
        heading: "Active Accounts",
        text: "We retain your data for as long as your account is active and for a reasonable period thereafter to allow you to reactivate it.",
      },
      {
        heading: "After Termination",
        text: "Following account termination or a deletion request, personal data is purged within 30 days. Aggregated, anonymised statistics may be retained indefinitely.",
      },
    ],
  },
  {
    id: "contact",
    icon: Mail,
    title: "Contact Us",
    content: [
      {
        heading: "Privacy Questions",
        text: "If you have any questions about this Privacy Policy or how we handle your data, please email us at privacy@salonflow.lk. We aim to respond within 5 business days.",
      },
      {
        heading: "Data Deletion Requests",
        text: "To request deletion of your data, please email privacy@salonflow.lk with the subject line 'Data Deletion Request' and include your salon name and registered email address.",
      },
    ],
  },
];

const PrivacyPolicy = () => {
  return (
    <>
      <SEO
        title="Privacy Policy — SalonFlow"
        description="Learn how SalonFlow collects, uses, and protects your personal and business data."
      />
      <div
        style={{ fontFamily: "'DM Sans', sans-serif", background: "#F7FAFC" }}
        className="min-h-screen text-[#0F2133]"
      >
        <style>{`
          @import url('https://fonts.googleapis.com/css2?family=Sora:wght@400;600;700;800&family=DM+Sans:wght@400;500;600;700&display=swap');
          .font-display { font-family: 'Sora', sans-serif; }
          :root {
            --sky: #F7FAFC; --sky-2: #EDF4FA; --blue: #2E86C1;
            --blue-pale: #E8F4FB; --blue-deep: #1A5F8A;
            --ink: #0F2133; --ink-mid: #2A4A66; --ink-light: #4A6E8C;
            --ink-muted: #7A9AB5; --border: rgba(15,33,51,0.08);
            --border-blue: rgba(46,134,193,0.2);
          }
        `}</style>

        {/* ── NAV ─────────────────────────────────────────────── */}
        <nav
          className="sticky top-0 z-50 border-b flex items-center justify-between px-6 sm:px-10 py-4"
          style={{ background: "rgba(247,250,252,0.95)", backdropFilter: "blur(12px)", borderColor: "var(--border)" }}
        >
          <Link to="/">
            <img src={logoImg} alt="SalonFlow" className="h-10 object-contain" />
          </Link>
          <Link
            to="/"
            className="flex items-center gap-2 text-sm font-semibold transition-colors hover:text-[var(--blue)]"
            style={{ color: "var(--ink-light)" }}
          >
            <ArrowLeft size={16} /> Back to Home
          </Link>
        </nav>

        {/* ── HERO ────────────────────────────────────────────── */}
        <div
          className="py-16 px-6 sm:px-10 text-center"
          style={{ background: "linear-gradient(180deg, var(--sky-2) 0%, var(--sky) 100%)", borderBottom: "1px solid var(--border)" }}
        >
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-bold mb-6"
            style={{ background: "var(--blue-pale)", color: "var(--blue)", border: "1px solid var(--border-blue)" }}>
            <Shield size={13} /> Privacy Policy
          </div>
          <h1 className="font-display text-4xl sm:text-5xl font-bold mb-4" style={{ color: "var(--ink)" }}>
            Your Data, Protected
          </h1>
          <p className="max-w-xl mx-auto text-base" style={{ color: "var(--ink-light)", lineHeight: 1.7 }}>
            We take the privacy of your salon and your clients seriously. This policy explains what data we collect, how we use it, and the rights you have over it.
          </p>
          <p className="mt-4 text-xs font-medium" style={{ color: "var(--ink-muted)" }}>
            Last updated: June 2026
          </p>
        </div>

        {/* ── CONTENT ─────────────────────────────────────────── */}
        <div className="max-w-4xl mx-auto px-6 sm:px-10 py-16 space-y-6">

          {/* Quick nav */}
          <div className="rounded-2xl p-6 border mb-12"
            style={{ background: "rgba(255,255,255,0.88)", borderColor: "var(--border)", boxShadow: "0 4px 24px rgba(46,134,193,0.07)" }}>
            <p className="text-xs font-black uppercase tracking-widest mb-4" style={{ color: "var(--ink-muted)" }}>Contents</p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {sections.map((s) => (
                <a
                  key={s.id}
                  href={`#${s.id}`}
                  className="text-xs font-semibold px-3 py-2 rounded-xl transition-colors hover:bg-[var(--blue-pale)] hover:text-[var(--blue)]"
                  style={{ color: "var(--ink-light)" }}
                >
                  {s.title}
                </a>
              ))}
            </div>
          </div>

          {/* Sections */}
          {sections.map((section) => {
            const Icon = section.icon;
            return (
              <section
                key={section.id}
                id={section.id}
                className="rounded-2xl border overflow-hidden scroll-mt-24"
                style={{ background: "rgba(255,255,255,0.88)", borderColor: "var(--border)", boxShadow: "0 4px 24px rgba(46,134,193,0.06)" }}
              >
                {/* Section header */}
                <div className="flex items-center gap-3 px-6 py-5 border-b" style={{ borderColor: "var(--border)", background: "var(--sky-2)" }}>
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center"
                    style={{ background: "var(--blue-pale)", color: "var(--blue)" }}>
                    <Icon size={18} />
                  </div>
                  <h2 className="font-display font-bold text-lg" style={{ color: "var(--ink)" }}>
                    {section.title}
                  </h2>
                </div>

                {/* Section content */}
                <div className="px-6 py-6 space-y-5">
                  {section.content.map((item, i) => (
                    <div key={i} className={i < section.content.length - 1 ? "pb-5 border-b" : ""} style={{ borderColor: "var(--border)" }}>
                      <h3 className="font-semibold text-sm mb-1.5" style={{ color: "var(--ink-mid)" }}>
                        {item.heading}
                      </h3>
                      <p className="text-sm leading-relaxed" style={{ color: "var(--ink-light)" }}>
                        {item.text}
                      </p>
                    </div>
                  ))}
                </div>
              </section>
            );
          })}

          {/* Changes notice */}
          <div className="rounded-2xl border p-6 flex gap-4"
            style={{ background: "var(--blue-pale)", borderColor: "var(--border-blue)" }}>
            <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
              style={{ background: "var(--blue)", color: "#fff" }}>
              <RefreshCw size={17} />
            </div>
            <div>
              <h3 className="font-semibold text-sm mb-1" style={{ color: "var(--blue-deep)" }}>
                Changes to This Policy
              </h3>
              <p className="text-sm leading-relaxed" style={{ color: "var(--ink-light)" }}>
                We may update this Privacy Policy from time to time. When we do, we will revise the "Last updated" date at the top of this page and, for significant changes, notify you by email. Continued use of SalonFlow after any change constitutes your acceptance of the new terms.
              </p>
            </div>
          </div>
        </div>

        {/* ── FOOTER ──────────────────────────────────────────── */}
        <footer className="py-10 border-t" style={{ background: "var(--sky-2)", borderColor: "var(--border)" }}>
          <div className="max-w-4xl mx-auto px-6 sm:px-10 flex flex-col sm:flex-row items-center justify-between gap-4">
            <img src={logoImg} alt="SalonFlow" className="h-12 object-contain" />
            <div className="flex items-center gap-6">
              <Link to="/" className="text-xs font-semibold transition-colors hover:text-[var(--blue)]"
                style={{ color: "var(--ink-muted)" }}>Home</Link>
              <Link to="/privacy-policy" className="text-xs font-semibold transition-colors"
                style={{ color: "var(--blue)" }}>Privacy Policy</Link>
              <a href="mailto:privacy@salonflow.lk" className="text-xs font-semibold transition-colors hover:text-[var(--blue)]"
                style={{ color: "var(--ink-muted)" }}>Contact</a>
            </div>
            <p className="text-xs" style={{ color: "var(--ink-muted)" }}>
              © 2026 SalonFlow. All rights reserved.
            </p>
          </div>
        </footer>
      </div>
    </>
  );
};

export default PrivacyPolicy;
