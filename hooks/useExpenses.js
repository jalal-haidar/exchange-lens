import { useQuery } from "@tanstack/react-query";
import { API_ENDPOINTS } from "@/lib/shared/api";
import { fetchAPI } from "@/lib/utils/fetchAPI";

export function useExpenses(options = {}) {
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["expenses"],
    queryFn: async ({ signal }) => {
      const result = await fetchAPI(API_ENDPOINTS.EXPENSES.LIST, { signal });
      if (!result.success) throw new Error(result.error);
      return result.data?.expenses || [];
    },
    staleTime: 30 * 1000,
    ...options,
  });

  return { expenses: data || [], isLoading, error: error?.message ?? null, refetch };
}

export function useExpenseCategories(options = {}) {
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["expense-categories"],
    queryFn: async ({ signal }) => {
      const result = await fetchAPI(API_ENDPOINTS.EXPENSES.CATEGORIES, { signal });
      if (!result.success) throw new Error(result.error);
      return result.data?.categories || [];
    },
    staleTime: 5 * 60 * 1000,
    ...options,
  });

  return { categories: data || [], isLoading, error: error?.message ?? null, refetch };
}
