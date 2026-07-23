import { useQuery } from "@tanstack/react-query";
import { API_ENDPOINTS } from "@/lib/shared/api";
import { queryKeys } from "@/lib/shared/queryKeys";
import { fetchAPI } from "@/lib/utils/fetchAPI";

export function useFinancialAccounts(options = {}) {
  const query = useQuery({
    queryKey: queryKeys.accounts.all,
    queryFn: async ({ signal }) => {
      const result = await fetchAPI(API_ENDPOINTS.ACCOUNTS.LIST, { signal });
      if (!result.success) throw new Error(result.error);
      return {
        accounts: result.data?.accounts || [],
        currencies: result.data?.currencies || [],
      };
    },
    staleTime: 15_000,
    ...options,
  });

  return {
    accounts: query.data?.accounts || [],
    currencies: query.data?.currencies || [],
    isLoading: query.isLoading,
    error: query.error?.message ?? null,
    refetch: query.refetch,
  };
}
