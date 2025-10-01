import type { Metadata } from 'next';
import './globals.css';

import Header from '@/app/Header';
import { UserProvider } from '@/app/auth/UserContext';
import { createClient } from '@/utils/supabase/ssr';
import type { Viewport } from 'next';
import { Toaster } from 'sonner';

import { GeistMono } from 'geist/font/mono';
import { GeistSans } from 'geist/font/sans';
import Link from 'next/link';

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

  let userInfo = null;
  if (user) {
    const { data } = await supabase
      .from('profiles')
      .select()
      .eq('id', user?.id)
      .single();

    userInfo = data;
  }
  return (
    <html lang="en" className={`${GeistSans.variable} ${GeistMono.variable}`}>
      <body className={'min-h-screen bg-background font-sans antialiased'}>
        <main>
          <UserProvider user={userInfo}>
            <Header />
            {children}

            <Toaster closeButton richColors />
          </UserProvider>
        </main>
        <div className="flex h-16 items-center justify-center border-t border-gray-200 bg-background">
          <p className="text-center text-sm text-gray-400">
            Made by{' '}
            <Link
              className="font-semibold text-gray-800 hover:underline"
              href="https://twitter.com/mohamed3on"
            >
              Mohamed
            </Link>
          </p>
        </div>
      </body>
    </html>
  );
}
