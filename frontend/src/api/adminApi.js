import apiClient from "./client";

export const getPendingCustomers = async () => {
  const { data } = await apiClient.get("/admin/customers/pending");
  return data;
};

export const getCustomers = async () => {
  const { data } = await apiClient.get("/admin/customers");
  return data;
};

export const getAdminSummary = async (year, month) => {
  const { data } = await apiClient.get("/admin/summary", { params: { year, month } });
  return data;
};

export const getMonthlyCollectionsAnalytics = async (year, month, monthsBack = 6) => {
  const { data } = await apiClient.get("/admin/analytics/monthly-collections", {
    params: { year, month, months_back: monthsBack },
  });
  return data;
};

export const getAuditLogs = async (params = {}) => {
  const { data } = await apiClient.get("/admin/audit-logs", {
    params: {
      limit: params.limit ?? 50,
      offset: params.offset ?? 0,
      action: params.action || undefined,
      entity_type: params.entityType || undefined,
      q: params.q || undefined,
      actor_user_id: params.actorUserId || undefined,
      start_date: params.startDate || undefined,
      end_date: params.endDate || undefined,
    },
  });
  return data;
};

export const approveCustomer = async (customerId) => {
  const { data } = await apiClient.patch(`/admin/customers/${customerId}/approve`);
  return data;
};

export const rejectCustomer = async (customerId) => {
  const { data } = await apiClient.patch(`/admin/customers/${customerId}/reject`);
  return data;
};

export const createMilkEntry = async (payload) => {
  const { data } = await apiClient.post("/admin/milk-entries", payload);
  return data;
};

export const updateMilkEntry = async (entryId, payload) => {
  const { data } = await apiClient.patch(`/admin/milk-entries/${entryId}`, payload);
  return data;
};

export const deleteMilkEntry = async (entryId) => {
  await apiClient.delete(`/admin/milk-entries/${entryId}`);
};

export const listMilkEntries = async (customerId, startDate, endDate) => {
  const { data } = await apiClient.get("/admin/milk-entries", {
    params: { customer_id: customerId, start_date: startDate, end_date: endDate },
  });
  return data;
};

export const generateBill = async (customerId, year, month) => {
  const { data } = await apiClient.post(`/admin/bills/generate/${customerId}`, null, {
    params: { year, month },
  });
  return data;
};

export const listCustomerBills = async (customerId, options = {}) => {
  const { data } = await apiClient.get(`/admin/bills/customer/${customerId}`, {
    params: {
      only_locked: options.onlyLocked || undefined,
      only_unpaid: options.onlyUnpaid || undefined,
    },
  });
  return data;
};

export const lockBillMonth = async (billId) => {
  const { data } = await apiClient.post(`/admin/bills/${billId}/lock`);
  return data;
};

export const unlockBillMonth = async (billId, reason = "") => {
  const { data } = await apiClient.post(`/admin/bills/${billId}/unlock`, { reason });
  return data;
};

export const recordPayment = async (payload) => {
  const { data } = await apiClient.post("/admin/payments", payload);
  return data;
};

export const getBillPdfUrl = (billId) => {
  const base = import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8000/api/v1";
  return `${base}/bills/${billId}/pdf`;
};

function triggerBlobDownload(blob, filename) {
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.URL.revokeObjectURL(url);
}

export const downloadMonthlyEntriesCsv = async (year, month) => {
  const response = await apiClient.get("/admin/exports/monthly-entries.csv", {
    params: { year, month },
    responseType: "blob",
  });
  triggerBlobDownload(response.data, `monthly_entries_${year}_${String(month).padStart(2, "0")}.csv`);
};

export const downloadDailyLogsPdf = async (customerId, year, month) => {
  const response = await apiClient.get("/admin/exports/daily-logs.pdf", {
    params: { customer_id: customerId, year, month },
    responseType: "blob",
  });
  triggerBlobDownload(response.data, `daily_logs_customer_${customerId}_${year}_${String(month).padStart(2, "0")}.pdf`);
};

export const downloadMonthlyBillsCsv = async (year, month) => {
  const response = await apiClient.get("/admin/exports/monthly-bills.csv", {
    params: { year, month },
    responseType: "blob",
  });
  triggerBlobDownload(response.data, `monthly_bills_${year}_${String(month).padStart(2, "0")}.csv`);
};

export const downloadAuditLogsCsv = async (params = {}) => {
  const response = await apiClient.get("/admin/exports/audit-logs.csv", {
    params: {
      action: params.action || undefined,
      entity_type: params.entityType || undefined,
      q: params.q || undefined,
      actor_user_id: params.actorUserId || undefined,
      start_date: params.startDate || undefined,
      end_date: params.endDate || undefined,
    },
    responseType: "blob",
  });
  triggerBlobDownload(response.data, "audit_logs.csv");
};
