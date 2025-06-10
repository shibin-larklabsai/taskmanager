import { Outlet } from 'react-router-dom';
import { AdminSidebar } from './AdminSidebar';
import { MainNav } from '@/components/navigation/MainNav';

export function AdminLayout() {
  return (
    <div className="flex flex-col h-screen bg-gray-50">
      <MainNav />
      <div className="flex flex-1 overflow-hidden">
        <AdminSidebar />
        <main className="flex-1 overflow-y-auto">
          <div className="p-6">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
