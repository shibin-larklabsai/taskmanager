import { RouteObject } from 'react-router-dom';
import { ProjectManagerLayout } from '@/components/project-manager/ProjectManagerLayout';
import { ProjectManagerDashboard } from '@/pages/project-manager/ProjectManagerDashboard';
import { ProjectManagerTasks } from '@/pages/project-manager/ProjectManagerTasks';
import TasksPage from '@/pages/project-manager/TasksPage';
import { TaskDetailPage } from '@/pages/project-manager/TaskDetailPage';
import { EditTaskPage } from '@/pages/project-manager/EditTaskPage';
import { CreateTaskPage } from '@/pages/project-manager/CreateTaskPage';
import { TeamAssignment } from '@/pages/project-manager/TeamAssignment';

export const projectManagerRoutes: RouteObject[] = [
  {
    path: '/project-manager',
    element: <ProjectManagerLayout />,
    children: [
      {
        index: true,
        element: <ProjectManagerDashboard />,
      },
      {
        path: 'projects',
        element: <ProjectManagerTasks />,
      },
      {
        path: 'team',
        element: <TeamAssignment />,
      },
      {
        path: 'tasks',
        children: [
          {
            index: true,
            element: <TasksPage />,
          },
          {
            path: 'new',
            element: <CreateTaskPage />,
          },
          {
            path: ':taskId',
            element: <TaskDetailPage />,
          },
          {
            path: ':taskId/edit',
            element: <EditTaskPage />,
          },
        ],
      },
    ],
  },
];
