import type { Metadata } from "next";
import CartPageClient from "./CartPageClient";

// Per-user, no unique content to index.
export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default function CartPage() {
  return <CartPageClient />;
}
