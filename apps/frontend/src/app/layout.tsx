import './globals.css';
import type { Metadata } from 'next';
import type { ReactNode } from 'react';

import { BuildGuard } from '@/components/build-guard';
import { Toaster } from '@/components/ui/toaster';
import { BUILD_ID } from '@/lib/build-id';

export const metadata: Metadata = {
  title: {
    default: 'JobDev — Get hired faster',
    template: '%s · JobDev',
  },
  description:
    'JobDev connects candidates and recruiters. Create an account, complete your profile and get hired faster.',
  icons: { icon: '/logo-mark.svg' },
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <meta name="app-build" content={BUILD_ID} />
      </head>
      <body
        className="min-h-screen bg-background text-foreground antialiased"
        suppressHydrationWarning
      >
        {children}
        <BuildGuard />
        <Toaster />
      </body>
    </html>
  );
}
