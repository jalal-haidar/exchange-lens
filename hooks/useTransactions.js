import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/lib/shared/queryKeys";
import { API_ENDPOINTS, buildQueryString } from "@/lib/shared/api";
import { fetchAPI } from "@/lib/utils/fetchAPI";
import { toast } from "sonner";

export function useTransactions(filters = {}, options = {}) {
  const { page = 1, limit = 20, ...restFilters } = filters;
  const params = { page, limit, ...restFilters };

  const { data, isLoading, isError, error, refetch, isFetching } = useQuery({
    queryKey: queryKeys.transactions.list(filters),
    queryFn: async ({ signal }) => {
      const url = API_ENDPOINTS.TRANSACTIONS.LIST + buildQueryString(params);
      const result = await fetchAPI(url, { signal });
      if (!result.success) throw new Error(result.error);
      return { transactions: result.data?.transactions, pagination: result.pagination };
    },
    staleTime: 15 * 1000,
    gcTime: 10 * 60 * 1000,
    ...options,
  });

  return {
    transactions: data?.transactions || [],
    pagination: data?.pagination,
    isLoading,
    isError,
    error: error?.message ?? null,
    refetch,
    isFetching,
  };
}

export function useTransaction(id, options = {}) {
  const { data: transaction, isLoading, error, refetch } = useQuery({
    queryKey: queryKeys.transactions.detail(id),
    queryFn: async ({ signal }) => {
      const result = await fetchAPI(API_ENDPOINTS.TRANSACTIONS.GET(id), { signal });
      if (result.success && result.data?.transaction) return result.data.transaction;
      throw new Error(result.error);
    },
    enabled: !!id,
    staleTime: 30_000,
    ...options,
  });

  return { transaction, isLoading, error: error?.message ?? null, refetch };
}

export function useTransactionMutations() {
  const queryClient = useQueryClient();

  const createTransaction = useMutation({
    mutationFn: async (data) => {
      const result = await fetchAPI(API_ENDPOINTS.TRANSACTIONS.CREATE, {
        method: "POST",
        body: JSON.stringify(data),
      });
      if (!result.success) throw new Error(result.error);
      return result.data.transaction;
    },
    onSuccess: (transaction) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.transactions.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.stats });
      if (transaction.customer_id) {
        queryClient.invalidateQueries({ queryKey: queryKeys.customers.ledger(transaction.customer_id) });
      }
      toast.success("Transaction recorded successfully");
    },
    onError: (error) => {
      toast.error(error.message || "Failed to record transaction");
    },
  });

  return { createTransaction };
}
