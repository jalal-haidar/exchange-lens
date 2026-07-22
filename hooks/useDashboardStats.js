import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "@/lib/shared/queryKeys";
import { API_ENDPOINTS, buildQueryString } from "@/lib/shared/api";
import { fetchAPI } from "@/lib/utils/fetchAPI";

export function useDashboardStats(params = {}, options = {}) {
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: [...queryKeys.dashboard.stats, params],
    queryFn: async ({ signal }) => {
      const url = API_ENDPOINTS.DASHBOARD.STATS + buildQueryString(params);
      const result = await fetchAPI(url, { signal });
      if (!result.success) throw new Error(result.error);
      return result.data;
    },
    staleTime: 30 * 1000,
    ...options,
  });

  return {
    stats: data?.stats || null,
    recentTransactions: data?.recentTransactions || [],
    isLoading,
    error: error?.message ?? null,
    refetch,
  };
}
