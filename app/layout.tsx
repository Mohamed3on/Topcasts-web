import { cn } from '@/lib/utils';
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';

import Header from '@/app/Header';
import { UserProvider } from '@/app/auth/UserContext';
import { createClient } from '@/utils/supabase/server';
import { Analytics } from '@vercel/analytics/react';
import type { Viewport } from 'next';
import { Toaster } from 'sonner';

const inter = Inter({ subsets: ['latin'], variable: '--font-sans' });

export const metadata: Metadata = {
  title: 'Topcasts',
  description: 'A podcast episode discovery platform',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return (
    <html lang="en">
      <body
        className={cn(
          'min-h-screen bg-background font-sans antialiased',
          inter.variable,
        )}
      >
        <Analytics />
        <main>
          <UserProvider user={user}>
            <Header />
            {children}

            <Toaster />
          </UserProvider>
        </main>
      </body>
    </html>
  );
}
