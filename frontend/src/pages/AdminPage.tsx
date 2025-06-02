import { useAuth } from '@/contexts/AuthContext';
import { useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Users, FolderKanban } from 'lucide-react';

export function AdminPage() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !user) {
      navigate('/login', { replace: true });
    } else if (!loading && user && !user.roles?.includes('admin')) {
      navigate('/dashboard', { replace: true });
    }
  }, [user, loading, navigate]);

  if (loading || !user) {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>;
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Admin Panel</h1>
          <p className="text-lg text-muted-foreground">Manage your application's users and projects</p>
        </div>

        <div className="grid gap-6 md:grid-cols-2 max-w-2xl mx-auto">
          {/* Users Card */}
          <Card className="hover:shadow-lg transition-shadow duration-200 border border-gray-200">
            <Link to="/admin/users" className="block h-full">
              <CardHeader className="pb-2">
                <div className="flex items-center space-x-4">
                  <div className="p-3 rounded-lg bg-blue-50">
                    <Users className="h-8 w-8 text-blue-600" />
                  </div>
                  <div>
                    <CardTitle className="text-2xl">Users</CardTitle>
                    <CardDescription>Manage application users</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  View, add, edit, and manage user accounts and permissions
                </p>
              </CardContent>
            </Link>
          </Card>

          {/* Projects Card */}
          <Card className="hover:shadow-lg transition-shadow duration-200 border border-gray-200">
            <Link to="/admin/projects" className="block h-full">
              <CardHeader className="pb-2">
                <div className="flex items-center space-x-4">
                  <div className="p-3 rounded-lg bg-green-50">
                    <FolderKanban className="h-8 w-8 text-green-600" />
                  </div>
                  <div>
                    <CardTitle className="text-2xl">Projects</CardTitle>
                    <CardDescription>Manage projects and tasks</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Create, update, and manage projects and their tasks
                </p>
              </CardContent>
            </Link>
          </Card>
        </div>

        <div className="mt-12 text-center">
          <Button 
            variant="outline" 
            onClick={() => navigate('/dashboard')}
            className="px-6 py-2"
          >
            Back to Dashboard
          </Button>
        </div>
      </div>
    </div>
  );
}

export default AdminPage;
