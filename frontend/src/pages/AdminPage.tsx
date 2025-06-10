import { useAuth } from '@/contexts/AuthContext';
import { useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, FolderKanban } from 'lucide-react';

export function AdminPage() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !user) {
      navigate('/login', { replace: true });
    } else if (!loading && user && !user.roles?.some(role => 
      (typeof role === 'string' ? role : role.name) === 'admin'
    )) {
      navigate('/dashboard', { replace: true });
    }
  }, [user, loading, navigate]);

  if (loading || !user) {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Dashboard</h1>
      </div>
      
      <div className="grid gap-6 md:grid-cols-2">
        {/* Users Card */}
        <Card className="hover:shadow-lg transition-shadow duration-200">
          <Link to="/admin/users" className="block h-full">
            <CardHeader className="pb-2">
              <div className="flex items-center space-x-4">
                <div className="p-3 rounded-lg bg-blue-50">
                  <Users className="h-8 w-8 text-blue-600" />
                </div>
                <div>
                  <CardTitle className="text-xl">Users</CardTitle>
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
        <Card className="hover:shadow-lg transition-shadow duration-200">
          <Link to="/admin/projects" className="block h-full">
            <CardHeader className="pb-2">
              <div className="flex items-center space-x-4">
                <div className="p-3 rounded-lg bg-green-50">
                  <FolderKanban className="h-8 w-8 text-green-600" />
                </div>
                <div>
                  <CardTitle className="text-xl">Projects</CardTitle>
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
    </div>
  );
}

export default AdminPage;
