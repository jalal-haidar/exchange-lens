import { useQuery } from "@tanstack/react-query";
import { API_ENDPOINTS, buildQueryString } from "@/lib/shared/api";
import { fetchAPI } from "@/lib/utils/fetchAPI";

export function useReports(type = "summary", params = {}, options = {}) {
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["reports", type, params],
    queryFn: async ({ signal }) => {
      let url;
      switch (type) {
        case "summary":
          url = API_ENDPOINTS.REPORTS.SUMMARY;
          break;
        case "customer":
          url = API_ENDPOINTS.REPORTS.CUSTOMER;
          break;
        case "profit-loss":
          url = API_ENDPOINTS.REPORTS.PROFIT_LOSS;
          break;
        default:
          url = API_ENDPOINTS.REPORTS.SUMMARY;
      }
      const result = await fetchAPI(url + buildQueryString(params), { signal });
      if (!result.success) throw new Error(result.error);
      return result.data;
    },
    staleTime: 30 * 1000,
    ...options,
  });

  return { data, isLoading, error: error?.message ?? null, refetch };
}
