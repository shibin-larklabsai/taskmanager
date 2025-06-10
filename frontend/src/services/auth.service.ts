import { post } from '@/lib/api';

// Define role type that can be either a string or an object with a name property
type UserRole = string | { name: string; [key: string]: any };

interface LoginCredentials {
  email: string;
  password: string;
}

interface RegisterData extends LoginCredentials {
  name: string;
}

interface AuthResponse {
  token: string;
  user: {
    id: string;
    name: string;
    email: string;
    roles?: string[];
  };
}

export const authService = {
  async login(credentials: LoginCredentials) {
    try {
      const response = await post<{ success: boolean; data: AuthResponse }>('/auth/login', credentials);
      if (response.data?.success && response.data.data) {
        const { token, user } = response.data.data;
        
        // Ensure roles is always an array of strings
        const formatRoles = (roles: any): string[] => {
          if (!Array.isArray(roles)) return [];
          return roles.map(role => {
            if (typeof role === 'string') return role;
            if (role && typeof role === 'object' && 'name' in role) {
              return String(role.name);
            }
            return String(role);
          });
        };
        
        const formattedUser = {
          ...user,
          roles: formatRoles(user.roles)
        };
        
        localStorage.setItem('token', token);
        localStorage.setItem('user', JSON.stringify(formattedUser));
        return { data: { token, user: formattedUser } };
      }
      throw new Error('Login failed: Invalid response from server');
    } catch (error: any) {
      console.error('Login error:', error);
      if (error?.response?.data?.message) {
        throw new Error(error.response.data.message);
      }
      throw new Error(error.message || 'An unexpected error occurred during login');
    }
  },

  async register(userData: RegisterData) {
    try {
      const response = await post<{ success: boolean; data: AuthResponse }>('/auth/register', userData);
      if (response.data?.success && response.data.data) {
        const { token, user } = response.data.data;
        
        // Ensure roles is always an array of strings
        const formatRoles = (roles: any): string[] => {
          if (!Array.isArray(roles)) return [];
          return roles.map(role => {
            if (typeof role === 'string') return role;
            if (role && typeof role === 'object' && 'name' in role) {
              return String(role.name);
            }
            return String(role);
          });
        };
        
        const formattedUser = {
          ...user,
          roles: formatRoles(user.roles)
        };
        
        localStorage.setItem('token', token);
        localStorage.setItem('user', JSON.stringify(formattedUser));
        return { data: { token, user: formattedUser } };
      }
      throw new Error('Registration failed: Invalid response from server');
    } catch (error: any) {
      console.error('Registration error:', error);
      
      // Handle API errors with detailed messages
      if (error?.response?.data?.message) {
        throw new Error(error.response.data.message);
      }
      
      // Handle validation errors
      if (error?.response?.data?.details) {
        const details = error.response.data.details;
        const errorMessage = typeof details === 'string' ? details : 
          Array.isArray(details) ? details.join('\n') : 
          JSON.stringify(details);
        throw new Error(errorMessage);
      }
      
      throw new Error(error.message || 'An unexpected error occurred during registration');
    }
  },

  logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = '/login';
  },

  getCurrentUser() {
    try {
      const userStr = localStorage.getItem('user');
      if (!userStr || userStr === 'undefined') {
        return null;
      }
      return JSON.parse(userStr);
    } catch (error) {
      console.error('Error parsing user data:', error);
      localStorage.removeItem('user');
      return null;
    }
  },

  getAuthHeader() {
    const token = localStorage.getItem('token');
    return token ? { Authorization: `Bearer ${token}` } : {};
  },

  isAuthenticated() {
    return !!localStorage.getItem('token');
  },
};
