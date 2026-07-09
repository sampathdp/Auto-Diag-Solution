"use client";

import { useState } from "react";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "react-hot-toast";
import { createAdminQueryClient } from "@/lib/admin/query-client";
import { MSWProvider } from "./MSWProvider";

export function AdminProviders({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(createAdminQueryClient);

  return (
    <QueryClientProvider client={queryClient}>
      <MSWProvider>{children}</MSWProvider>
      <Toaster position="top-right" />
    </QueryClientProvider>
  );
}
