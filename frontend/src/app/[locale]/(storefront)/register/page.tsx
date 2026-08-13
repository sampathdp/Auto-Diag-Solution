import type { Metadata } from "next";
import RegisterPageClient from "./RegisterPageClient";

// Transactional/auth page — no unique content to index.
export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default function RegisterPage() {
  return <RegisterPageClient />;
}
