import apiClient from "./client";

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

export const getMyLogs = async (year, month) => {
  const { data } = await apiClient.get("/customer/logs/me", { params: { year, month } });
  return data;
};

export const getMyBills = async () => {
  const { data } = await apiClient.get("/customer/bills/me");
  return data;
};

export const getMyPayments = async () => {
  const { data } = await apiClient.get("/customer/payments/me");
  return data;
};

export const getMyBillPdfUrl = (billId) => {
  const base = import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8000/api/v1";
  return `${base}/bills/${billId}/pdf`;
};

export const downloadMyLogsCsv = async (year, month) => {
  const response = await apiClient.get("/customer/exports/my-logs.csv", {
    params: { year, month },
    responseType: "blob",
  });
  triggerBlobDownload(response.data, `my_logs_${year}_${String(month).padStart(2, "0")}.csv`);
};

export const downloadMyBillsCsv = async (year, month) => {
  const response = await apiClient.get("/customer/exports/my-bills.csv", {
    params: { year, month },
    responseType: "blob",
  });
  triggerBlobDownload(response.data, `my_bills_${year}_${String(month).padStart(2, "0")}.csv`);
};
