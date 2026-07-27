"use client";

import { AuthProvider } from "@/contexts/AuthContext";
import { ExchangeAccessProvider } from "@/contexts/ExchangeAccessContext";
import { QueryProvider } from "@/contexts/QueryProvider";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { Toaster } from "sonner";
import EcosystemAppRegistration from "@/components/EcosystemAppRegistration";

export function Providers({ children }) {
  return (
    <ThemeProvider>
      <QueryProvider>
        <AuthProvider>
          <EcosystemAppRegistration />
          <ExchangeAccessProvider>
            {children}
            <Toaster richColors position="bottom-right" />
          </ExchangeAccessProvider>
        </AuthProvider>
      </QueryProvider>
    </ThemeProvider>
  );
}
