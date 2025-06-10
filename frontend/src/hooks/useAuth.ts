import { useState, useEffect } from 'react';
import { authService } from '../services/auth.service';

interface AuthState {
  isAuthenticated: boolean;
  user: any | null;
  loading: boolean;
}

export function useAuth() {
  const [authState, setAuthState] = useState<AuthState>({
    isAuthenticated: false,
    user: null,
    loading: true,
  });

  useEffect(() => {
    // Check if user is already logged in
    const token = localStorage.getItem('token');
    const user = authService.getCurrentUser();
    
    setAuthState({
      isAuthenticated: !!token,
      user,
      loading: false,
    });

    // Listen for storage events to sync auth state across tabs
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'token' || e.key === 'user') {
        const newToken = localStorage.getItem('token');
        const newUser = authService.getCurrentUser();
        
        setAuthState({
          isAuthenticated: !!newToken,
          user: newUser,
          loading: false,
        });
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  return {
    ...authState,
    login: authService.login,
    logout: authService.logout,
    register: authService.register,
  };
}
