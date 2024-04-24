import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { cn } from '@/lib/utils';

import { AuthProvider } from '@/app/auth/AuthProvider';
import { createClient } from '@/utils/supabase/server';

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
  const supabase = createClient();

  const { data } = await supabase.auth.getUser();

  const user = data.user ? data.user : null;

  return (
    <html lang='en'>
      <body className={cn('min-h-screen bg-background font-sans antialiased', inter.variable)}>
        <AuthProvider user={user}>{children}</AuthProvider>
      </body>
    </html>
  );
}
