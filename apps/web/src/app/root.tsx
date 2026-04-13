import { Links, Meta, Outlet, Scripts, ScrollRestoration } from 'react-router';
import type { ReactNode } from 'react';
import { RootErrorBoundary } from '~/components/error-boundary';
import { Providers } from './providers';

function Document({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className="h-full">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="theme-color" content="#0D0D0D" />
        <title>FlowPig - Notion x Linear Mashup</title>
        <Meta />
        <Links />
      </head>
      <body className="min-h-screen bg-[#0D0D0D] text-white antialiased">
        <Providers>{children}</Providers>
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  );
}

export function Layout({ children }: { children: ReactNode }) {
  return <Document>{children}</Document>;
}

export default function App() {
  return <Outlet />;
}

export function HydrateFallback() {
  return (
    <Document>
      <div className="min-h-screen bg-[#0D0D0D]" />
    </Document>
  );
}

export function ErrorBoundary() {
  return (
    <Document>
      <RootErrorBoundary />
    </Document>
  );
}
