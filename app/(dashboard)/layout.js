"use client";

import { AppLayout } from "@/components/shared";
import ExchangeAccessGate from "@/components/access/ExchangeAccessGate";

export default function DashboardLayout({ children }) {
  return (
    <ExchangeAccessGate>
      <AppLayout>{children}</AppLayout>
    </ExchangeAccessGate>
  );
}
