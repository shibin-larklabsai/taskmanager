import { RouteObject } from 'react-router-dom';
import ProjectsPage from '@/pages/developer/ProjectsPage';
import { DeveloperTasksPage } from '@/pages/developer/TasksPage';
import { DeveloperLayout } from '@/components/developer/DeveloperLayout';

export const developerRoutes: RouteObject[] = [
  {
    path: '',
    element: <DeveloperLayout />,
    children: [
      {
        index: true,
        element: <ProjectsPage />,
      },
      {
        path: 'tasks',
        element: <DeveloperTasksPage />,
      },
      // Add more developer-specific routes here as needed
    ],
  },
];
