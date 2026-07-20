import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/lib/shared/queryKeys";
import { API_ENDPOINTS, buildQueryString } from "@/lib/shared/api";
import { fetchAPI } from "@/lib/utils/fetchAPI";
import { toast } from "sonner";

export function useCustomers(filters = {}, options = {}) {
  const { page = 1, limit = 20, ...restFilters } = filters;
  const params = { page, limit, ...restFilters };

  const { data, isLoading, isError, error, refetch, isFetching } = useQuery({
    queryKey: queryKeys.customers.list(filters),
    queryFn: async ({ signal }) => {
      const url = API_ENDPOINTS.CUSTOMERS.LIST + buildQueryString(params);
      const result = await fetchAPI(url, { signal });
      if (!result.success) throw new Error(result.error);
      return { customers: result.data?.customers, pagination: result.pagination };
    },
    staleTime: 30 * 1000,
    gcTime: 10 * 60 * 1000,
    ...options,
  });

  return {
    customers: data?.customers || [],
    pagination: data?.pagination,
    isLoading,
    isError,
    error: error?.message ?? null,
    refetch,
    isFetching,
  };
}

export function useCustomer(id, options = {}) {
  const { data: customer, isLoading, error, refetch } = useQuery({
    queryKey: queryKeys.customers.detail(id),
    queryFn: async ({ signal }) => {
      const result = await fetchAPI(API_ENDPOINTS.CUSTOMERS.GET(id), { signal });
      if (result.success && result.data?.customer) return result.data.customer;
      throw new Error(result.error);
    },
    enabled: !!id,
    staleTime: 30_000,
    gcTime: 5 * 60_000,
    ...options,
  });

  return { customer, isLoading, error: error?.message ?? null, refetch };
}

export function useCustomerLedger(id, filters = {}, options = {}) {
  const { page = 1, limit = 20, ...restFilters } = filters;
  const params = { page, limit, ...restFilters };

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: queryKeys.customers.ledger(id, filters),
    queryFn: async ({ signal }) => {
      const url = API_ENDPOINTS.CUSTOMERS.LEDGER(id) + buildQueryString(params);
      const result = await fetchAPI(url, { signal });
      if (!result.success) throw new Error(result.error);
      return { ledger: result.data?.ledger, balance: result.data?.balance, pagination: result.pagination };
    },
    enabled: !!id,
    staleTime: 15_000,
    ...options,
  });

  return {
    ledger: data?.ledger || [],
    balance: data?.balance || 0,
    pagination: data?.pagination,
    isLoading,
    error: error?.message ?? null,
    refetch,
  };
}

export function useCustomerMutations() {
  const queryClient = useQueryClient();

  const invalidateAll = () => {
    queryClient.invalidateQueries({ queryKey: queryKeys.customers.all });
  };

  const createCustomer = useMutation({
    mutationFn: async (data) => {
      const result = await fetchAPI(API_ENDPOINTS.CUSTOMERS.CREATE, {
        method: "POST",
        body: JSON.stringify(data),
      });
      if (!result.success) throw new Error(result.error);
      return result.data.customer;
    },
    onSuccess: () => {
      invalidateAll();
      toast.success("Customer created successfully");
    },
    onError: (error) => {
      toast.error(error.message || "Failed to create customer");
    },
  });

  const updateCustomer = useMutation({
    mutationFn: async ({ id, data }) => {
      const result = await fetchAPI(API_ENDPOINTS.CUSTOMERS.UPDATE(id), {
        method: "PUT",
        body: JSON.stringify(data),
      });
      if (!result.success) throw new Error(result.error);
      return result.data.customer;
    },
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.customers.detail(id) });
      invalidateAll();
      toast.success("Customer updated successfully");
    },
    onError: (error) => {
      toast.error(error.message || "Failed to update customer");
    },
  });

  const deleteCustomer = useMutation({
    mutationFn: async (id) => {
      const result = await fetchAPI(API_ENDPOINTS.CUSTOMERS.DELETE(id), {
        method: "DELETE",
      });
      if (!result.success) throw new Error(result.error);
      return result;
    },
    onSuccess: () => {
      invalidateAll();
      toast.success("Customer deleted successfully");
    },
    onError: (error) => {
      toast.error(error.message || "Failed to delete customer");
    },
  });

  return { createCustomer, updateCustomer, deleteCustomer };
}
