'use client';
import React from 'react';

import Logout from './LogOutButton'; // Replace with the actual path to Logout component
import { useAuth } from '@/app/auth/AuthContext';
import Image from 'next/image';

const Header: React.FC = () => {
  const { user } = useAuth(); // Replace with the actual hook and state names

  return (
    <header className='flex items-center justify-between p-4 bg-gray-200'>
      <div className='font-bold'>Topcasts</div>
      {user && (
        <div className='flex items-center space-x-2'>
          {user.photoURL && (
            <Image
              width={32}
              height={32}
              unoptimized
              src={user.photoURL}
              alt={user.displayName || ''}
              className='w-8 h-8 rounded-full'
              referrerPolicy='no-referrer'
            />
          )}
          <div>{user.displayName}</div>
          <Logout />
        </div>
      )}
    </header>
  );
};

export default Header;
