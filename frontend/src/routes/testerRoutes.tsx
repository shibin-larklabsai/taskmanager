import { RouteObject } from 'react-router-dom';
import { TesterProjectsPage } from '@/pages/tester/TesterProjectsPage';
import { TesterProjectDetailPage } from '@/pages/tester/TesterProjectDetailPage';

export const testerRoutes: RouteObject[] = [
  {
    path: '',
    children: [
      {
        index: true,
        element: <TesterProjectsPage />,
      },
      {
        path: 'projects/:projectId',
        element: <TesterProjectDetailPage />,
      },
      // Add more tester-specific routes here as needed
    ],
  },
];
