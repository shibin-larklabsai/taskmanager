import { useState, useEffect } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertCircle } from 'lucide-react';

export function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { login, isAuthenticated } = useAuth();
  
  // Check if user is already authenticated
  useEffect(() => {
    if (isAuthenticated) {
      const returnUrl = searchParams.get('returnUrl') || '/';
      navigate(returnUrl, { replace: true });
    }
  }, [isAuthenticated, navigate, searchParams]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email || !password) {
      return setError('Please fill in all fields');
    }

    try {
      setError('');
      setLoading(true);
      
      // Call login and wait for it to complete
      const user = await login(email, password);
      
      if (user) {
        // Determine user role and set redirect path
        let redirectPath = searchParams.get('returnUrl') || '/';
        
        // If no specific return URL is set, redirect based on role
        if (redirectPath === '/') {
          const isProjectManager = user.roles?.some(role => 
            (typeof role === 'string' && role === 'project_manager') || 
            (typeof role === 'object' && role.name === 'project_manager')
          );
          
          const isDeveloper = user.roles?.some(role =>
            (typeof role === 'string' && role === 'developer') ||
            (typeof role === 'object' && role.name === 'developer')
          );
          
          const isAdmin = user.roles?.some(role =>
            (typeof role === 'string' && role === 'admin') ||
            (typeof role === 'object' && role.name === 'admin')
          );
          
          if (isAdmin) {
            redirectPath = '/dashboard';
          } else if (isProjectManager) {
            redirectPath = '/project-manager';
          } else if (isDeveloper) {
            redirectPath = '/developer';
          }
        }
        
        navigate(redirectPath, { replace: true });
      } else {
        setError('Login successful but no user data received');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to log in. Please try again.';
      setError(errorMessage);
      console.error('Login error:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold text-center">Sign in to your account</CardTitle>
          <CardDescription className="text-center">
            Enter your email and password to access your account
          </CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4">
            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Error</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="m@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password">Password</Label>
                <Link to="/forgot-password" className="text-sm font-medium text-primary hover:underline">
                  Forgot password?
                </Link>
              </div>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
          </CardContent>
          <CardFooter className="flex flex-col space-y-4">
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'Signing in...' : 'Sign in'}
            </Button>
            <div className="text-sm text-center">
              Don't have an account?{' '}
              <Link to="/register" className="font-medium text-primary hover:underline">
                Sign up
              </Link>
            </div>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
