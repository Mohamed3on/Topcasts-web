import React from 'react';

import { getHost } from '@/app/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { createClient } from '@/utils/supabase/server';
import { SearchIcon } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import Logout from './logout/LogOutButton';

const Header: React.FC = async () => {
  const supabase = createClient();
  const { data } = await supabase.auth.getUser();
  const user = data?.user;

  return (
    <header className="border-b-1 flex items-center justify-between border px-4 py-2 shadow-sm">
      <Button
        className="duration-30 transition-duration-100 text-lg font-bold text-primary transition-colors hover:text-primary/50"
        asChild
        variant={'link'}
      >
        <Link href="/">Topcasts</Link>
      </Button>
      <div className="flex items-center gap-1">
        <Button asChild variant={'link'}>
          <Link href="/episodes">Browse Episodes</Link>
        </Button>
        {data?.user && (
          <Button asChild variant={'link'}>
            <Link href="/episode/add">Add an episode</Link>
          </Button>
        )}
      </div>
      <div>
        <form
          action={async (formData) => {
            'use server';
            const search = formData.get('search');

            if (search) {
              const href = `${getHost()}/episodes?q=${search}`;
              redirect(href);
            }
          }}
        >
          <Input
            name="search"
            type="search"
            placeholder="Search"
            endIcon={SearchIcon}
          />
        </form>
      </div>
      {user && (
        <div className="flex items-center space-x-1">
          {user.user_metadata && (
            <Image
              width={32}
              height={32}
              unoptimized
              src={user.user_metadata.avatar_url || ''}
              alt={user.user_metadata.name || ''}
              className="h-8 w-8 rounded-full"
              referrerPolicy="no-referrer"
            />
          )}
          <span className="text-sm font-semibold text-primary/60">
            {user.user_metadata.name}
          </span>
          <Logout />
        </div>
      )}
      {!user && (
        <div>
          <Button asChild variant={'link'}>
            <Link href="/login">Login</Link>
          </Button>
        </div>
      )}
    </header>
  );
};

export default Header;
