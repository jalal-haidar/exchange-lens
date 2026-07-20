import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/lib/shared/queryKeys";
import { API_ENDPOINTS } from "@/lib/shared/api";
import { fetchAPI } from "@/lib/utils/fetchAPI";
import { toast } from "sonner";

export function useRates(options = {}) {
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: queryKeys.rates.latest,
    queryFn: async ({ signal }) => {
      const result = await fetchAPI(API_ENDPOINTS.RATES.LATEST, { signal });
      if (!result.success) throw new Error(result.error);
      return result.data?.rates || [];
    },
    staleTime: 60 * 1000,
    gcTime: 5 * 60 * 1000,
    ...options,
  });

  return { rates: data || [], isLoading, error: error?.message ?? null, refetch };
}

export function useRateHistory(currencyId, options = {}) {
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: queryKeys.rates.history(currencyId),
    queryFn: async ({ signal }) => {
      const url = currencyId
        ? `${API_ENDPOINTS.RATES.HISTORY}?currency_id=${currencyId}`
        : API_ENDPOINTS.RATES.HISTORY;
      const result = await fetchAPI(url, { signal });
      if (!result.success) throw new Error(result.error);
      return result.data?.rates || [];
    },
    staleTime: 60 * 1000,
    ...options,
  });

  return { rates: data || [], isLoading, error: error?.message ?? null, refetch };
}

export function useCurrencies(options = {}) {
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: queryKeys.currencies.all,
    queryFn: async ({ signal }) => {
      const result = await fetchAPI("/api/v1/rates/latest", { signal });
      if (!result.success) throw new Error(result.error);
      // Extract unique currencies from rates
      const rates = result.data?.rates || [];
      const currencyMap = new Map();
      rates.forEach((r) => {
        if (r.currency && !currencyMap.has(r.currency.id)) {
          currencyMap.set(r.currency.id, r.currency);
        }
      });
      return Array.from(currencyMap.values());
    },
    staleTime: 5 * 60 * 1000,
    ...options,
  });

  return { currencies: data || [], isLoading, error: error?.message ?? null, refetch };
}

export function useRateMutations() {
  const queryClient = useQueryClient();

  const updateRates = useMutation({
    mutationFn: async (rates) => {
      const result = await fetchAPI(API_ENDPOINTS.RATES.UPDATE, {
        method: "POST",
        body: JSON.stringify({ rates }),
      });
      if (!result.success) throw new Error(result.error);
      return result.data.rates;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.rates.all });
      toast.success("Rates updated successfully");
    },
    onError: (error) => {
      toast.error(error.message || "Failed to update rates");
    },
  });

  return { updateRates };
}
