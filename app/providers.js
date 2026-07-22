"use client";

import { AuthProvider } from "@/contexts/AuthContext";
import { ExchangeAccessProvider } from "@/contexts/ExchangeAccessContext";
import { QueryProvider } from "@/contexts/QueryProvider";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { Toaster } from "sonner";

export function Providers({ children }) {
  return (
    <ThemeProvider>
      <QueryProvider>
        <AuthProvider>
          <ExchangeAccessProvider>
            {children}
            <Toaster richColors position="bottom-right" />
          </ExchangeAccessProvider>
        </AuthProvider>
      </QueryProvider>
    </ThemeProvider>
  );
}
