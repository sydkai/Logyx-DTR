import axios from "axios";

/**
 * Always call the API on the same host that served the page.
 * Employees/admins open http://<office-server-ip>:3001/leave — requests must
 * go to that server, not localhost on their own PC.
 */
function resolveApiBaseUrl() {
  if (typeof window !== "undefined" && window.location?.origin) {
    return `${window.location.origin}/api`;
  }
  return "/api";
}

const api = axios.create({
  baseURL: resolveApiBaseUrl(),
  withCredentials: true,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("logyx_token");
  if (token && token !== "null" && token !== "undefined") {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error.response?.status;
    const message = error.response?.data?.error || "";
    if (
      status === 401 &&
      /token|sign in|session/i.test(message)
    ) {
      localStorage.removeItem("logyx_token");
    }
    return Promise.reject(error);
  }
);

export default api;
