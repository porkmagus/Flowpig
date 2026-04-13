import { isRouteErrorResponse, useRouteError } from 'react-router';
import { AlertTriangle, Home, RefreshCw } from 'lucide-react';
import { Link } from 'react-router';

export function RootErrorBoundary() {
  const error = useRouteError();

  if (isRouteErrorResponse(error)) {
    return (
      <div className="min-h-screen bg-linear-elevated/50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-linear-surface rounded-xl shadow-lg border border-linear-border p-8 text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertTriangle className="w-8 h-8 text-red-600" />
          </div>
          <h1 className="text-2xl font-bold text-linear-text mb-2">
            {error.status === 404 ? 'Page Not Found' : `Error ${error.status}`}
          </h1>
          <p className="text-linear-text-secondary mb-6">
            {error.status === 404 
              ? "The page you're looking for doesn't exist."
              : error.statusText || 'Something went wrong.'
            }
          </p>
          <div className="flex gap-3 justify-center">
            <Link
              to="/"
              className="inline-flex items-center gap-2 px-4 py-2 bg-linear-bg text-linear-text rounded-lg hover:bg-linear-surface transition-colors"
            >
              <Home className="w-4 h-4" />
              Go Home
            </Link>
            <button
              onClick={() => window.location.reload()}
              className="inline-flex items-center gap-2 px-4 py-2 border border-linear-border rounded-lg hover:bg-linear-elevated/50 transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
              Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Handle other errors (JavaScript errors, etc.)
  const message = error instanceof Error ? error.message : 'Unknown error occurred';
  
  return (
    <div className="min-h-screen bg-linear-elevated/50 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-linear-surface rounded-xl shadow-lg border border-linear-border p-8 text-center">
        <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <AlertTriangle className="w-8 h-8 text-red-600" />
        </div>
        <h1 className="text-2xl font-bold text-linear-text mb-2">Oops!</h1>
        <p className="text-linear-text-secondary mb-4">
          Sorry, an unexpected error has occurred.
        </p>
        <p className="text-sm text-linear-text-secondary bg-linear-elevated/50 rounded-lg p-3 mb-6 font-mono">
          {message}
        </p>
        <div className="flex gap-3 justify-center">
          <Link
            to="/"
            className="inline-flex items-center gap-2 px-4 py-2 bg-linear-bg text-linear-text rounded-lg hover:bg-linear-surface transition-colors"
          >
            <Home className="w-4 h-4" />
            Go Home
          </Link>
          <button
            onClick={() => window.location.reload()}
            className="inline-flex items-center gap-2 px-4 py-2 border border-linear-border rounded-lg hover:bg-linear-elevated/50 transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            Retry
          </button>
        </div>
      </div>
    </div>
  );
}
