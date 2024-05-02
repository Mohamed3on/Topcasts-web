import { LoginWithGoogle } from '@/app/login/LoginWithGoogle';
import { createClient } from '@/utils/supabase/server';
import { redirect } from 'next/navigation';

export default async function Login() {
  const supabase = createClient();
  const { data: userData } = await supabase.auth.getUser();

  if (userData.user) {
    redirect('/episodes');
  }
  return (
    <main className='flex min-h-screen flex-col items-center justify-center p-8'>
      <div className='w-full bg-white rounded-lg shadow dark:border md:mt-0 sm:max-w-md xl:p-0 dark:bg-gray-800 dark:border-gray-700'>
        <div className='p-6 space-y-4 md:space-y-6 sm:p-8 text-center flex flex-col'>
          <h1 className='text-xl font-bold leading-tight tracking-tight text-gray-900 md:text-2xl dark:text-white'>
            Login to Topcasts
          </h1>

          <LoginWithGoogle />
        </div>
      </div>
    </main>
  );
}
