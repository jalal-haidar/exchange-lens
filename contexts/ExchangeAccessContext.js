"use client";

import { createContext, useContext } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { fetchAPI } from "@/lib/utils/fetchAPI";
import { hasPermission } from "@/lib/access/permissions";

const ExchangeAccessContext = createContext(null);

export function ExchangeAccessProvider({ children }) {
  const { user, loading: authLoading } = useAuth();
  const query = useQuery({
    queryKey: ["exchange-access", user?.id],
    enabled: !authLoading && Boolean(user),
    queryFn: async ({ signal }) => {
      const result = await fetchAPI("/api/v1/access", { signal });
      return result.access;
    },
    staleTime: 30_000,
    retry: 1,
  });

  const access = query.data || null;
  const value = {
    access,
    state: access?.state || (query.isLoading || authLoading ? "loading" : "unavailable"),
    role: access?.role || null,
    organization: access?.organization || null,
    permissions: access?.permissions || [],
    can: (permission) => hasPermission(access, permission),
    isLoading: authLoading || query.isLoading,
    error: query.error,
    refresh: query.refetch,
  };

  return (
    <ExchangeAccessContext.Provider value={value}>
      {children}
    </ExchangeAccessContext.Provider>
  );
}

export function useExchangeAccess() {
  const context = useContext(ExchangeAccessContext);
  if (!context) throw new Error("useExchangeAccess must be used within ExchangeAccessProvider");
  return context;
}
