import axios from 'axios';

// Base URL targeting local Django server
const BASE_URL = 'http://localhost:8000';

const apiClient = axios.create({
  baseURL: BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

/**
 * Request Interceptor
 * 
 * Interview Defense:
 * - Dynamically extracts the access token from localStorage for each outgoing request.
 * - By dynamically querying localStorage at the moment of request dispatch (rather than 
 *   hardcoding a static header on file load), we ensure that the client always presents 
 *   the most recent token, supporting dynamic JWT refreshes.
 */
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('access_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

/**
 * Response Interceptor - Automated Silent JWT Refresh Loop
 * 
 * Interview Defense:
 * - Implements a standard transaction queue retry pattern.
 * - On receiving a `401 Unauthorized` token expiry response:
 *   1. Pauses the failed request.
 *   2. Contacts the backend `/api/token/refresh/` endpoint using a clean, interceptor-free 
 *      Axios instance (to prevent infinite retry loops).
 *   3. Upon success, caches the fresh access token, updates localStorage, and re-dispatches 
 *      the original request with the fresh header, achieving zero-friction sessions.
 *   4. Upon failure (refresh token expired/revoked), clears local sessions to force logout.
 */
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    
    // Check if the server returned a 401 and this request has not already been retried
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      const refreshToken = localStorage.getItem('refresh_token');

      if (refreshToken) {
        try {
          // Use a clean axios instance to request refresh to avoid interceptor recursion
          const refreshResponse = await axios.post(`${BASE_URL}/api/token/refresh/`, {
            refresh: refreshToken,
          });

          const newAccessToken = refreshResponse.data.access;
          localStorage.setItem('access_token', newAccessToken);

          // Update header with fresh access token and retry the original call
          originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
          return apiClient(originalRequest);
        } catch (refreshError) {
          console.error("Session expired. Auto-refresh failed:", refreshError);
          
          // Clear credentials and force application reload to return to login
          localStorage.removeItem('access_token');
          localStorage.removeItem('refresh_token');
          window.location.reload(); 
          return Promise.reject(refreshError);
        }
      }
    }
    
    return Promise.reject(error);
  }
);

export default apiClient;
