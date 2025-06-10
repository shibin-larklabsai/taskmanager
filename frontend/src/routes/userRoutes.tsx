import { RouteObject } from 'react-router-dom';
import { UserDashboard } from '@/pages/user';
import { UserLayout } from '@/components/user/UserLayout';

export const userRoutes: RouteObject[] = [
  {
    path: '',
    element: <UserLayout />,
    children: [
      {
        index: true,
        element: <UserDashboard />,
      },
      // Add more user-specific routes here as needed
    ],
  },
];
