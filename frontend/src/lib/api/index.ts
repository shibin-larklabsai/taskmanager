import api from './axios';

export interface ApiResponse<T = any> {
  data: T;
  error?: string;
  status: number;
}

// Helper function to handle API requests
export const apiRequest = async <T = any>(
  method: 'get' | 'post' | 'put' | 'delete' | 'patch',
  url: string,
  data?: any,
  config?: any
): Promise<{ data: T; status: number }> => {
  try {
    const response = await api.request<T>({
      method,
      url,
      data,
      ...config,
    });
    return { 
      data: response.data, 
      status: response.status 
    };
  } catch (error: any) {
    throw new Error(error.response?.data?.message || error.message || 'An error occurred');
  }
};

// Convenience methods
export const get = <T = any>(url: string, config?: any) =>
  apiRequest<T>('get', url, undefined, config);

export const post = <T = any>(url: string, data?: any, config?: any) =>
  apiRequest<T>('post', url, data, config);

export const put = <T = any>(url: string, data?: any, config?: any) =>
  apiRequest<T>('put', url, data, config);

export const del = <T = any>(url: string, config?: any) =>
  apiRequest<T>('delete', url, undefined, config);

export const patch = <T = any>(url: string, data?: any, config?: any) =>
  apiRequest<T>('patch', url, data, config);

export default api;
