import { logout } from '@/app/logout/actions';

export default function LogOut() {
  return (
    <form action={logout}>
      <button className='text-white bg-gray-600 hover:bg-gray-700 focus:ring-4 focus:outline-none focus:ring-primary-300 font-medium rounded-lg text-sm px-5 py-2.5 text-center dark:bg-gray-600 dark:hover:bg-gray-700 dark:focus:ring-primary-800'>
        Logout
      </button>
    </form>
  );
}
