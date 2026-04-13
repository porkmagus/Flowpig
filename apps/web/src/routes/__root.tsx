import { Outlet } from 'react-router';
import { RootErrorBoundary } from '~/components/error-boundary';

export default function RootRoute() {
  return (
    <div className="min-h-screen bg-gray-50">
      <Outlet />
    </div>
  );
}

export function ErrorBoundary() {
  return <RootErrorBoundary />;
}
