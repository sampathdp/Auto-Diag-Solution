import type { Metadata } from "next";
import CheckoutPageClient from "./CheckoutPageClient";

// Behind interaction, no unique content to index — and definitely not a page we want
// showing up in search results for a checkout flow.
export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default function CheckoutPage() {
  return <CheckoutPageClient />;
}
