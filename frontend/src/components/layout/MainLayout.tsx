import { Outlet } from 'react-router-dom';
import { MainNav } from '@/components/navigation/MainNav';
import { TaskUpdatesListener } from '@/components/TaskUpdatesListener';

interface MainLayoutProps {
  children?: React.ReactNode;
}

const MainLayout = ({ children }: MainLayoutProps) => {
  return (
    <div className="h-screen bg-background flex flex-col">
      <TaskUpdatesListener />
      <MainNav />
      <main className="flex-1 overflow-y-auto p-6">
        <div className="max-w-7xl mx-auto">
          {children || <Outlet />}
        </div>
      </main>
    </div>
  );
};

export default MainLayout;
