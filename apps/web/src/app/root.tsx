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
      <body className="min-h-screen bg-linear-bg text-linear-text antialiased">
        <Providers>{children}</Providers>
        <ScrollRestoration />
        <Scripts />
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  var theme = localStorage.getItem('flowpig:theme');
                  if (theme === 'light') document.documentElement.classList.add('light');
                  else if (theme === 'dark') document.documentElement.classList.remove('light');
                  else if (window.matchMedia('(prefers-color-scheme: light)').matches) document.documentElement.classList.add('light');
                } catch (e) {}
              })();
            `,
          }}
        />
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
      <div className="min-h-screen bg-linear-bg" />
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
