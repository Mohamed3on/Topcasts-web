import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { cn } from '@/lib/utils';
import { getTokens } from 'next-firebase-auth-edge';
import { cookies } from 'next/headers';

import { clientConfig, serverConfig } from '../config';
import { AuthProvider } from '@/app/auth/AuthProvider';
import { toUser } from '@/app/auth/utils';

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
  const credential = await getTokens(cookies(), {
    apiKey: clientConfig.apiKey,
    cookieName: serverConfig.cookieName,
    cookieSignatureKeys: serverConfig.cookieSignatureKeys,
    serviceAccount: serverConfig.serviceAccount,
  });
  const user = credential ? toUser(credential) : null;

  return (
    <html lang='en'>
      <body className={cn('min-h-screen bg-background font-sans antialiased', inter.variable)}>
        <AuthProvider user={user}>{children}</AuthProvider>
      </body>
    </html>
  );
}
