import { Outlet } from 'react-router-dom';

export function DeveloperLayout() {
  return (
    <div className="flex-1 p-6">
      <Outlet />
    </div>
  );
}
