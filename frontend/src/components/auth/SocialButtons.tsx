"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Script from "next/script";
import { useTranslations } from "next-intl";
import toast from "react-hot-toast";
import { useRouter } from "@/i18n/navigation";
import { useAuthStore } from "@/store/useAuthStore";
import { AuthService } from "@/services/AuthService";

const GOOGLE_CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
const FACEBOOK_APP_ID = process.env.NEXT_PUBLIC_FACEBOOK_APP_ID;

function FacebookIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="#1877F2" aria-hidden="true">
      <path d="M24 12.07C24 5.4 18.63 0 12 0S0 5.4 0 12.07C0 18.1 4.39 23.1 10.13 24v-8.44H7.08v-3.49h3.05V9.41c0-3.02 1.79-4.7 4.53-4.7 1.31 0 2.68.24 2.68.24v2.97h-1.51c-1.49 0-1.95.93-1.95 1.89v2.26h3.32l-.53 3.49h-2.79V24C19.61 23.1 24 18.1 24 12.07Z" />
    </svg>
  );
}

export function SocialButtons() {
  const t = useTranslations("auth");
  const router = useRouter();
  const setAuth = useAuthStore((state) => state.setAuth);
  const googleBtnRef = useRef<HTMLDivElement>(null);
  const [fbReady, setFbReady] = useState(false);
  const [busy, setBusy] = useState(false);

  const completeLogin = useCallback(
    (data: unknown) => {
      const { user, permissions } = data as { user: any; permissions: string[] };
      setAuth(user, permissions || []);
      router.push("/account/overview");
    },
    [router, setAuth]
  );

  const handleFailure = (provider: string) => {
    toast.error(t("socialLoginFailed", { provider }));
  };

  const handleGoogleCredential = useCallback(
    async (response: { credential: string }) => {
      setBusy(true);
      try {
        const data = await AuthService.googleLogin({ credential: response.credential });
        completeLogin(data);
      } catch {
        handleFailure("Google");
      } finally {
        setBusy(false);
      }
    },
    [completeLogin]
  );

  const renderGoogleButton = useCallback(() => {
    if (!GOOGLE_CLIENT_ID || !window.google || !googleBtnRef.current) return;

    window.google.accounts.id.initialize({
      client_id: GOOGLE_CLIENT_ID,
      callback: handleGoogleCredential,
    });

    googleBtnRef.current.innerHTML = "";
    const width = Math.round(googleBtnRef.current.getBoundingClientRect().width) || 220;
    window.google.accounts.id.renderButton(googleBtnRef.current, {
      type: "standard",
      theme: "outline",
      size: "large",
      shape: "rectangular",
      text: "continue_with",
      logo_alignment: "center",
      width,
    });
  }, [handleGoogleCredential]);

  const initFacebook = useCallback(() => {
    if (!FACEBOOK_APP_ID || !window.FB) return;
    window.FB.init({ appId: FACEBOOK_APP_ID, cookie: false, xfbml: false, version: "v19.0" });
    setFbReady(true);
  }, []);

  // The Google/Facebook SDK scripts are shared across every page that renders this
  // component; next/script won't re-run onLoad on a route change once already
  // loaded, so also check for an already-present SDK on mount.
  useEffect(() => {
    if (window.google) renderGoogleButton();
    if (window.FB) initFacebook();
  }, [renderGoogleButton, initFacebook]);

  const handleFacebookLogin = () => {
    if (!window.FB) return;
    setBusy(true);
    window.FB.login(
      async (response) => {
        const token = response.authResponse?.accessToken;
        if (!token) {
          setBusy(false);
          // status === "unknown" is the normal shape for a user-dismissed popup —
          // not an error worth surfacing.
          if (response.status !== "unknown") handleFailure("Facebook");
          return;
        }
        try {
          const data = await AuthService.facebookLogin({ access_token: token });
          completeLogin(data);
        } catch {
          handleFailure("Facebook");
        } finally {
          setBusy(false);
        }
      },
      { scope: "public_profile,email" }
    );
  };

  return (
    <div>
      <Script src="https://accounts.google.com/gsi/client" strategy="afterInteractive" onLoad={renderGoogleButton} />
      <Script src="https://connect.facebook.net/en_US/sdk.js" strategy="afterInteractive" onLoad={initFacebook} />

      <div className="my-6 flex items-center gap-4">
        <span className="h-px flex-1 bg-border" />
        <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
          {t("orContinueWith")}
        </span>
        <span className="h-px flex-1 bg-border" />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div ref={googleBtnRef} className="flex h-11 items-center justify-center overflow-hidden" />
        <button
          type="button"
          disabled={busy || !fbReady}
          onClick={handleFacebookLogin}
          className="flex h-11 items-center justify-center gap-2.5 rounded-md border border-border bg-card text-sm font-semibold text-foreground shadow-soft transition-colors hover:bg-secondary disabled:cursor-not-allowed disabled:opacity-50"
        >
          <FacebookIcon />
          Facebook
        </button>
      </div>
    </div>
  );
}
