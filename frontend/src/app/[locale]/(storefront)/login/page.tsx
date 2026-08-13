import type { Metadata } from "next";
import LoginPageClient from "./LoginPageClient";

// Transactional/auth page — no unique content to index.
export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default function LoginPage() {
  return <LoginPageClient />;
}
