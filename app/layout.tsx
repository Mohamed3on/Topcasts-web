import { cn } from '@/lib/utils';
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';

import { AddEpisodeDrawer } from '@/app/AddEpisodeDrawer';
import Header from '@/app/Header';
import { Suspense } from 'react';
import { Toaster } from 'sonner';

const inter = Inter({ subsets: ['latin'], variable: '--font-sans' });

export const metadata: Metadata = {
  title: 'Topcasts',
  description: 'A podcast episode discovery platform',
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={cn(
          'min-h-screen bg-background font-sans antialiased',
          inter.variable,
        )}
      >
        <main>
          <Header />
          {children}
          <Suspense>
            <AddEpisodeDrawer />
          </Suspense>
          <Toaster />
        </main>
      </body>
    </html>
  );
}
