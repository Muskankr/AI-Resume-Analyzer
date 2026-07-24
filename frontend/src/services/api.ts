import axios from "axios";

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || "http://127.0.0.1:8000";

// Create a configured Axios instance
const apiClient = axios.create({
  baseURL: BACKEND_URL,
});

/**
 * Upload and analyze a resume file along with target role and optional job description.
 */
export const analyzeResume = async (
  file: File,
  role: string,
  jobDescription: string,
  token?: string
) => {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("role", role);
  formData.append("job_description", jobDescription);

  const headers = token ? { Authorization: `Bearer ${token}` } : {};

  const response = await apiClient.post("/api/upload/", formData, { headers });
  return response.data;
};

/**
 * Fetch analysis history for an authenticated user.
 */
export const fetchAnalysisHistory = async (token: string) => {
  const response = await apiClient.get("/api/history/", {
    headers: { Authorization: `Bearer ${token}` },
  });
  return response.data;
};

/**
 * Delete a specific analysis history entry by ID.
 */
export const deleteHistoryEntry = async (id: string, token: string) => {
  const response = await apiClient.delete(`/api/history/${id}/`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return response.data;
};

/**
 * Clear all analysis history entries for an authenticated user.
 */
export const clearAnalysisHistory = async (token: string) => {
  const response = await apiClient.delete("/api/history/clear/", {
    headers: { Authorization: `Bearer ${token}` },
  });
  return response.data;
};

export default apiClient;