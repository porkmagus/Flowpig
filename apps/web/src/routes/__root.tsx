export default function RootRoute() {
  return (
    <div className="min-h-screen bg-gray-50">
      <Outlet />
    </div>
  );
}

import { Outlet } from 'react-router-dom';
