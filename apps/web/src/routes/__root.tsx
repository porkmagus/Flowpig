import { Outlet } from 'react-router';
import { RootErrorBoundary } from '~/components/error-boundary';

export default function RootRoute() {
  return (
    <div className="min-h-screen bg-[#0D0D0D]">
      <Outlet />
    </div>
  );
}

export function ErrorBoundary() {
  return <RootErrorBoundary />;
}
