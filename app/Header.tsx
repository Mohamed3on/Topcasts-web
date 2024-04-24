import React from 'react';

import Logout from './logout/LogOutButton';
import Image from 'next/image';
import { createClient } from '@/utils/supabase/server';
import Link from 'next/link';
import { useAuth } from '@/app/auth/AuthContext';

const Header: React.FC = async () => {
  const supabase = createClient();
  const { data } = await supabase.auth.getUser();
  const user = data?.user;

  return (
    <header className='flex items-center justify-between p-4 bg-gray-200'>
      <div className='font-bold'>Topcasts</div>
      {user && (
        <div className='flex items-center space-x-2'>
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
          <Link href='/login'>Login</Link>
        </div>
      )}
    </header>
  );
};

export default Header;
