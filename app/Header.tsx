import React from 'react';

import { Button } from '@/components/ui/button';
import { createClient } from '@/utils/supabase/server';
import Image from 'next/image';
import Link from 'next/link';
import Logout from './logout/LogOutButton';

const Header: React.FC = async () => {
  const supabase = createClient();
  const { data } = await supabase.auth.getUser();
  const user = data?.user;

  return (
    <header className='flex items-center justify-between p-4'>
      <Button className='font-bold text-primary text-lg' asChild variant={'link'}>
        <Link href='/'>Topcasts</Link>
      </Button>
      <div className='flex items-center space-x-1 text-gray-500'>
        <Button asChild variant={'link'}>
          <Link href='/episodes'>Browse Episodes</Link>
        </Button>
        {data?.user && (
          <Button asChild variant={'link'}>
            <Link href='/episode/add'>Add an episode</Link>
          </Button>
        )}
      </div>
      {user && (
        <div className='flex items-center space-x-1'>
          {user.user_metadata && (
            <Image
              width={32}
              height={32}
              unoptimized
              src={user.user_metadata.avatar_url || ''}
              alt={user.user_metadata.name || ''}
              className='w-8 h-8 rounded-full'
              referrerPolicy='no-referrer'
            />
          )}
          <div>{user.email}</div>
          <Logout />
        </div>
      )}
      {!user && (
        <div>
          <Button asChild variant={'link'}>
            <Link href='/login'>Login</Link>
          </Button>
        </div>
      )}
    </header>
  );
};

export default Header;
