import { Outlet } from 'react-router-dom';

export function UserLayout() {
  return (
    <div className="flex-1">
      <div className="container py-6">
        <Outlet />
      </div>
    </div>
  );
}
