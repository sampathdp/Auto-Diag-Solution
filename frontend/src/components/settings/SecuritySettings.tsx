import { useState, useEffect } from "react";
import { QRCodeSVG } from "qrcode.react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import apiClient from "@/api/client";
import toast from "react-hot-toast";
import { ShieldCheck, ShieldOff, KeyRound, Copy, Check } from "lucide-react";

type SetupData = {
  secret: string;
  otpauth_uri: string;
};

export const SecuritySettings = () => {
  const [loading, setLoading] = useState(true);
  const [enabled, setEnabled] = useState(false);

  const [setupData, setSetupData] = useState<SetupData | null>(null);
  const [code, setCode] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [recoveryCodes, setRecoveryCodes] = useState<string[] | null>(null);
  const [copied, setCopied] = useState(false);

  const [disableConfirm, setDisableConfirm] = useState(false);

  const loadStatus = async () => {
    setLoading(true);
    try {
      const { data } = await apiClient.get("/auth/2fa/status");
      setEnabled(!!data.data?.enabled);
    } catch {
      toast.error("Could not load two-factor authentication status");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStatus();
  }, []);

  const startSetup = async () => {
    setIsSubmitting(true);
    try {
      const { data } = await apiClient.post("/auth/2fa/setup");
      setSetupData(data.data);
      setCode("");
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed to start setup");
    } finally {
      setIsSubmitting(false);
    }
  };

  const confirmSetup = async () => {
    if (code.trim().length !== 6) {
      toast.error("Enter the 6-digit code from your authenticator app");
      return;
    }
    setIsSubmitting(true);
    try {
      const { data } = await apiClient.post("/auth/2fa/confirm", { code: code.trim() });
      setRecoveryCodes(data.data.recovery_codes);
      setSetupData(null);
      setEnabled(true);
      toast.success("Two-factor authentication enabled");
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Invalid code");
    } finally {
      setIsSubmitting(false);
    }
  };

  const disable2fa = async () => {
    setIsSubmitting(true);
    try {
      await apiClient.post("/auth/2fa/disable");
      setEnabled(false);
      setDisableConfirm(false);
      toast.success("Two-factor authentication disabled");
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed to disable");
    } finally {
      setIsSubmitting(false);
    }
  };

  const copyRecoveryCodes = () => {
    if (!recoveryCodes) return;
    navigator.clipboard.writeText(recoveryCodes.join("\n"));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (loading) {
    return <div className="max-w-2xl text-sm text-slate-500">Loading security settings…</div>;
  }

  // Recovery codes are shown exactly once, right after enabling
  if (recoveryCodes) {
    return (
      <div className="space-y-6 max-w-2xl">
        <h3 className="text-lg font-bold text-slate-900 border-b pb-4">Save Your Recovery Codes</h3>
        <p className="text-sm text-slate-600">
          Store these codes somewhere safe. Each one can be used once to sign in if you lose access
          to your authenticator app. They won't be shown again.
        </p>
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 grid grid-cols-2 gap-2 font-mono text-sm text-slate-800">
          {recoveryCodes.map((c) => (
            <div key={c}>{c}</div>
          ))}
        </div>
        <div className="flex gap-3">
          <Button variant="secondary" onClick={copyRecoveryCodes}>
            {copied ? <Check size={16} className="mr-2" /> : <Copy size={16} className="mr-2" />}
            {copied ? "Copied" : "Copy codes"}
          </Button>
          <Button onClick={() => setRecoveryCodes(null)}>Done</Button>
        </div>
      </div>
    );
  }

  // Mid-enrollment: show QR code + confirmation input
  if (setupData) {
    return (
      <div className="space-y-6 max-w-2xl">
        <h3 className="text-lg font-bold text-slate-900 border-b pb-4">Set Up Authenticator App</h3>
        <p className="text-sm text-slate-600">
          Scan this QR code with Google Authenticator, Authy, or a similar app, then enter the
          6-digit code it shows.
        </p>
        <div className="flex flex-col items-center gap-4 py-4">
          <div className="p-4 bg-white border border-slate-200 rounded-xl">
            <QRCodeSVG value={setupData.otpauth_uri} size={180} />
          </div>
          <p className="text-xs text-slate-500">
            Can't scan? Enter this code manually:{" "}
            <span className="font-mono font-semibold text-slate-700">{setupData.secret}</span>
          </p>
        </div>
        <div className="max-w-xs mx-auto">
          <Input
            label="Verification Code"
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
            placeholder="000000"
            maxLength={6}
          />
        </div>
        <div className="flex justify-center gap-3">
          <Button variant="secondary" onClick={() => setSetupData(null)}>
            Cancel
          </Button>
          <Button onClick={confirmSetup} loading={isSubmitting}>
            Verify &amp; Enable
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <h3 className="text-lg font-bold text-slate-900 border-b pb-4">Two-Factor Authentication</h3>

      <div className="flex items-start gap-4 p-5 rounded-xl border border-slate-200 bg-slate-50">
        <div className={`p-2.5 rounded-full ${enabled ? "bg-emerald-100 text-emerald-600" : "bg-slate-200 text-slate-500"}`}>
          {enabled ? <ShieldCheck size={20} /> : <ShieldOff size={20} />}
        </div>
        <div className="flex-1">
          <p className="font-semibold text-slate-900">
            {enabled ? "Two-factor authentication is enabled" : "Two-factor authentication is disabled"}
          </p>
          <p className="text-sm text-slate-500 mt-0.5">
            {enabled
              ? "Your account requires a code from your authenticator app at every login."
              : "Add an extra layer of security by requiring a code from an authenticator app at login."}
          </p>
        </div>
      </div>

      {!enabled && (
        <Button onClick={startSetup} loading={isSubmitting}>
          <KeyRound size={16} className="mr-2" /> Enable Two-Factor Authentication
        </Button>
      )}

      {enabled && !disableConfirm && (
        <Button variant="secondary" onClick={() => setDisableConfirm(true)}>
          Disable Two-Factor Authentication
        </Button>
      )}

      {enabled && disableConfirm && (
        <div className="p-4 rounded-xl border border-rose-200 bg-rose-50 space-y-3">
          <p className="text-sm text-rose-700 font-medium">
            Disabling removes this extra layer of protection from your account. Are you sure?
          </p>
          <div className="flex gap-3">
            <Button variant="secondary" onClick={() => setDisableConfirm(false)}>
              Cancel
            </Button>
            <Button variant="danger" onClick={disable2fa} loading={isSubmitting}>
              Yes, disable it
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};
