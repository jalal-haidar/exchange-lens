"use client";

import PermissionGate from "@/components/access/PermissionGate";
import CashflowManager from "@/components/cashflow/CashflowManager";
import { Permissions } from "@/lib/access/permissions";

export default function CashflowPage() {
  return (
    <PermissionGate permission={[
      Permissions.ACCOUNTS_READ,
      Permissions.SETTLEMENTS_POST,
      Permissions.TRANSFERS_POST,
    ]}>
      <CashflowManager />
    </PermissionGate>
  );
}
