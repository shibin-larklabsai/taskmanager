import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, Shield, Folder, Plus } from 'lucide-react';
import { Link } from 'react-router-dom';

export function AdminPage() {
  // These would typically come from an API
  const stats = [
    { name: 'Total Users', value: '1,234', icon: Users, change: '+12%', changeType: 'increase' },
    { name: 'Active Projects', value: '56', icon: Folder, change: '+5%', changeType: 'increase' },
    { name: 'User Roles', value: '8', icon: Shield, change: '+2', changeType: 'increase' },
  ];

  const quickActions = [
    { name: 'Add New User', href: '/admin/users/new', icon: Users },
    { name: 'Create Project', href: '/admin/projects/new', icon: Folder },
    { name: 'Manage Roles', href: '/admin/roles', icon: Shield },
  ];

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold tracking-tight">Admin Dashboard</h1>
        <p className="text-muted-foreground">
          Manage your application's users, roles, and projects
        </p>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 mb-8">
        {stats.map((stat) => (
          <Card key={stat.name}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                {stat.name}
              </CardTitle>
              <stat.icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value}</div>
              <p className={`text-xs ${stat.changeType === 'increase' ? 'text-green-600' : 'text-red-600'}`}>
                {stat.change} from last month
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Quick Actions */}
      <div className="mb-8">
        <h2 className="text-lg font-semibold mb-4">Quick Actions</h2>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {quickActions.map((action) => (
            <Link
              key={action.name}
              to={action.href}
              className="group border rounded-lg p-4 hover:bg-accent transition-colors"
            >
              <div className="flex items-center space-x-4">
                <div className="p-2 rounded-md bg-primary/10 text-primary">
                  <action.icon className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-medium group-hover:underline">{action.name}</h3>
                  <p className="text-sm text-muted-foreground">
                    {action.name.includes('User') 
                      ? 'Add a new user to the system' 
                      : action.name.includes('Project')
                      ? 'Create a new project'
                      : 'Manage user roles and permissions'}
                  </p>
                </div>
                <Plus className="ml-auto h-5 w-5 text-muted-foreground" />
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* Recent Activity */}
      <div>
        <h2 className="text-lg font-semibold mb-4">Recent Activity</h2>
        <div className="border rounded-lg p-4">
          <p className="text-sm text-muted-foreground">
            Recent activity will appear here
          </p>
        </div>
      </div>
    </div>
  );
}

export default AdminPage;
