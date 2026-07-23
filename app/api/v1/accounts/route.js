import { Permissions } from "@/lib/access/permissions";
import { requireExchangePermission } from "@/lib/access/server";
import { mapLedgerError, optionalText, requireUuid } from "@/lib/domain/ledgerInput";
import { asyncHandler } from "@/lib/utils/asyncHandler";
import { errorResponse, successResponse } from "@/lib/utils/response";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export const GET = asyncHandler(async (request) => {
  const { supabase } = await requireExchangePermission(request, [
    Permissions.ACCOUNTS_READ,
    Permissions.TRANSACTIONS_POST,
    Permissions.EXPENSES_POST,
  ]);
  const [accountsResult, currenciesResult] = await Promise.all([
    supabase.schema("exchange").rpc("get_financial_accounts"),
    supabase
      .schema("exchange")
      .from("currencies")
      .select("id, code, name, symbol, minor_unit")
      .eq("is_active", true)
      .order("code"),
  ]);
  if (accountsResult.error || currenciesResult.error) {
    const mapped = mapLedgerError(accountsResult.error || currenciesResult.error);
    return errorResponse(mapped.message, mapped.status);
  }
  return successResponse({
    data: {
      accounts: accountsResult.data || [],
      currencies: currenciesResult.data || [],
    },
  });
});

export const POST = asyncHandler(async (request) => {
  const { supabase } = await requireExchangePermission(
    request,
    Permissions.ACCOUNTS_MANAGE,
  );
  const body = await request.json();
  let input;
  try {
    input = {
      p_name: optionalText(body.name, 120),
      p_code: optionalText(body.code, 40),
      p_currency_id: requireUuid(body.currency_id, "Currency"),
      p_account_kind: body.account_kind,
      p_allow_negative: body.allow_negative === true,
    };
    if (!input.p_name || !input.p_code) {
      throw new TypeError("Account name and code are required");
    }
  } catch (error) {
    return errorResponse(error.message, 400);
  }
  const { data, error } = await supabase
    .schema("exchange")
    .rpc("create_financial_account", input)
    .single();
  if (error) {
    const mapped = mapLedgerError(error);
    return errorResponse(mapped.message, mapped.status);
  }
  return successResponse({ data: { account: data } }, 201);
});
