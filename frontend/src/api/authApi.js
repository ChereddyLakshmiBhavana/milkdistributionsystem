import apiClient from "./client";

export const signupCustomer = async (payload) => {
  const { data } = await apiClient.post("/auth/signup", payload);
  return data;
};

export const loginUser = async (payload) => {
  const { data } = await apiClient.post("/auth/login", payload);
  return data;
};
