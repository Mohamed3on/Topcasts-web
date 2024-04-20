'use client';

import { useRouter } from 'next/navigation';
import { getAuth, signOut } from 'firebase/auth';
import { app } from '../firebase';

export default function LogOut() {
  const router = useRouter();

  async function handleLogout() {
    await signOut(getAuth(app));

    await fetch('/api/logout');

    router.push('/login');
  }

  return (
    <button
      onClick={handleLogout}
      className='text-white bg-gray-600 hover:bg-gray-700 focus:ring-4 focus:outline-none focus:ring-primary-300 font-medium rounded-lg text-sm px-5 py-2.5 text-center dark:bg-gray-600 dark:hover:bg-gray-700 dark:focus:ring-primary-800'
    >
      Logout
    </button>
  );
}
