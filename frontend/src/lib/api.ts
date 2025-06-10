import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios';

// Define the shape of our error response
export interface ApiError extends Error {
  response?: {
    data?: {
      message?: string;
      error?: string;
      details?: any;
    };
    status?: number;
  };
  details?: any;
}

// Create axios instance with base URL
const api: AxiosInstance = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api',
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true,
});

// Request interceptor to add auth token to requests
api.interceptors.request.use(
  (config) => {
    // Skip adding auth header for login/register endpoints
    const publicEndpoints = ['/auth/login', '/auth/register'];
    if (publicEndpoints.some(endpoint => config.url?.includes(endpoint))) {
      return config;
    }
    
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    } else {
      console.warn('No authentication token found');
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle errors
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    
    // If error is 401 and we haven't tried to refresh the token yet
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      
      try {
        // Try to refresh the token
        const refreshToken = localStorage.getItem('refreshToken');
        if (refreshToken) {
          const response = await axios.post(
            `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api'}/auth/refresh-token`,
            { refreshToken }
          );
          
          if (response.data.accessToken) {
            localStorage.setItem('token', response.data.accessToken);
            // Update the Authorization header
            originalRequest.headers.Authorization = `Bearer ${response.data.accessToken}`;
            // Retry the original request
            return api(originalRequest);
          }
        }
      } catch (refreshError) {
        console.error('Error refreshing token:', refreshError);
      }
      
      // If we get here, token refresh failed or no refresh token
      localStorage.removeItem('token');
      localStorage.removeItem('refreshToken');
      localStorage.removeItem('user');
      window.location.href = '/login';
      return Promise.reject(error);
    }
    
    // Enhance error message with server response if available
    if (error.response?.data) {
      const { message, error: errorMessage, details } = error.response.data;
      const enhancedError = new Error(message || errorMessage || 'An error occurred');
      
      // Attach additional error details if available
      if (details) {
        (enhancedError as any).details = details;
      }
      
      // Preserve the original response
      (enhancedError as any).response = error.response;
      return Promise.reject(enhancedError);
    }
    
    return Promise.reject(error);
  }
);

// Helper function to make API requests
export const request = async <T>(
  config: AxiosRequestConfig
): Promise<{ data: T; status: number }> => {
  try {
    const response: AxiosResponse<T> = await api({
      ...config,
      headers: {
        'Content-Type': 'application/json',
        ...config.headers,
      },
      // Ensure we get the full response for error handling
      validateStatus: () => true
    });

    // Handle non-2xx responses
    if (response.status >= 300) {
      const responseData = response.data as any;
      const errorMessage = responseData?.message || responseData?.error || 'An error occurred';
      const error = new Error(errorMessage) as ApiError;
      error.response = {
        data: {
          message: responseData?.message,
          error: responseData?.error,
          details: responseData?.details
        },
        status: response.status
      };
      throw error;
    }

    return { data: response.data, status: response.status };
  } catch (error: any) {
    console.error('API Request Error:', error);
    
    // If it's already an enhanced error, just rethrow it
    if ((error as ApiError).response) {
      throw error;
    }
    
    // Handle network errors
    if (error.request) {
      throw new Error('Unable to connect to the server. Please check your internet connection.');
    }
    
    // Handle other errors
    throw new Error(error.message || 'An unexpected error occurred');
  }
};

// HTTP methods
export const get = <T>(url: string, config?: AxiosRequestConfig) =>
  request<T>({ ...config, method: 'GET', url });

export const post = <T>(url: string, data?: any, config?: AxiosRequestConfig) =>
  request<T>({ ...config, method: 'POST', url, data });

export const put = <T>(url: string, data?: any, config?: AxiosRequestConfig) =>
  request<T>({ ...config, method: 'PUT', url, data });

export const del = <T>(url: string, config?: AxiosRequestConfig) =>
  request<T>({ ...config, method: 'DELETE', url });

export default api;
