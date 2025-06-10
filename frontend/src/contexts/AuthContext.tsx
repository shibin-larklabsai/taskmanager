import { createContext, useContext, ReactNode, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { authService } from '@/services/auth.service';

interface UserRole {
  id?: string;
  name: string;
}

type UserRoleType = string | UserRole;

interface User {
  id: string;
  name: string;
  email: string;
  roles?: UserRoleType[];
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<User | undefined>;
  register: (name: string, email: string, password: string) => Promise<User | undefined>;
  logout: () => void;
  isAuthenticated: boolean;
  token: string | null;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    try {
      const token = localStorage.getItem('token');
      if (token) {
        const userData = authService.getCurrentUser();
        if (userData) {
          setUser(userData);
        } else {
          // Clear invalid user data
          authService.logout();
        }
      }
    } catch (error) {
      console.error('Error initializing auth state:', error);
      authService.logout();
    } finally {
      setLoading(false);
    }
  }, []);

  const login = async (email: string, password: string) => {
    try {
      const response = await authService.login({ email, password });
      if (response?.data?.user) {
        setUser(response.data.user);
        // Don't navigate here, let the LoginPage handle the navigation
        // to preserve the returnUrl parameter
        return response.data.user;
      }
      throw new Error('Invalid response from server');
    } catch (error) {
      console.error('Login failed:', error);
      throw error;
    }
  };

  const register = async (name: string, email: string, password: string) => {
    try {
      const response = await authService.register({ name, email, password });
      if (response?.data?.user) {
        setUser(response.data.user);
        // Don't navigate here, let the RegisterPage handle the navigation
        // to preserve the returnUrl parameter
        return response.data.user;
      }
      throw new Error('Invalid response from server');
    } catch (error: any) {
      console.error('Registration failed:', error);
      
      // If it's already an Error instance with a message, just rethrow it
      if (error instanceof Error) {
        throw error;
      }
      
      // For any other error type, throw a generic message
      throw new Error('Registration failed. Please try again.');
    }
  };

  const logout = () => {
    authService.logout();
    setUser(null);
    navigate('/login');
  };

  const [token, setToken] = useState<string | null>(() => localStorage.getItem('token'));

  // Update token state when it changes in localStorage
  useEffect(() => {
    const handleStorageChange = () => {
      setToken(localStorage.getItem('token'));
    };

    // Listen for changes to the token in localStorage
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  const value = {
    user,
    loading,
    login: async (email: string, password: string) => {
      const response = await login(email, password);
      setToken(localStorage.getItem('token'));
      return response;
    },
    register: async (name: string, email: string, password: string) => {
      const response = await register(name, email, password);
      setToken(localStorage.getItem('token'));
      return response;
    },
    logout: () => {
      logout();
      setToken(null);
    },
    isAuthenticated: !!user,
    token,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
