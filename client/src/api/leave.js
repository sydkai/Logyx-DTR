import api from "./axios";

export const getLeaves   = (params) => api.get("/leave", { params });
export const createLeave = (data) => api.post("/leave", data);
export const reviewLeave = (id, status) => api.patch(`/leave/${id}/review`, { status });
