import { useApiMutation } from "./useApi";
import apiClient from "@/api/client";
import { useQuery } from "@tanstack/react-query";

export const useBilling = () => {
  const listInvoices = (branchId?: number | null) => useQuery({
    queryKey: ['billing', 'invoices', branchId],
    queryFn: async () => {
      const { data } = await apiClient.get('/billing/invoices', { params: { branch_id: branchId } });
      return data.data;
    }
  });

  const create = () => useApiMutation(
    (data) => apiClient.post('/billing/invoices', data),
    "Invoice created successfully!",
    [['billing', 'invoices'], ['inventory']]
  );

  const getInvoiceDetails = (id: number) => useQuery({
    queryKey: ['billing', 'invoice', id],
    queryFn: async () => {
      const { data } = await apiClient.get(`/billing/invoices/${id}`);
      return data.data;
    },
    enabled: !!id
  });

  const getStatus = (id: number) => useQuery({
    queryKey: ['billing', 'status', id],
    queryFn: async () => {
      const { data } = await apiClient.get(`/billing/appointment/${id}/status`);
      return data.data;
    },
    enabled: !!id
  });

  const recordPayment = () => useApiMutation(
    (data: { appointment_id?: number | null, invoice_id?: number, amount: number, method: string }) => 
      apiClient.post('/billing/pay', data),
    "Payment recorded successfully!",
    [['billing', 'status'], ['billing', 'invoices'], ['billing', 'invoice']]
  );

  return { getStatus, recordPayment, listInvoices, getInvoiceDetails, create };
};
