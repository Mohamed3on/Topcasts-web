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
    <main className="flex min-h-screen flex-col items-center justify-center p-8">
      <div className="w-full rounded-lg bg-white shadow dark:border dark:border-gray-700 dark:bg-gray-800 sm:max-w-md md:mt-0 xl:p-0">
        <div className="flex flex-col space-y-4 p-6 text-center sm:p-8 md:space-y-6">
          <h1 className="text-xl font-bold leading-tight tracking-tight text-gray-900 dark:text-white md:text-2xl">
            Login to Topcasts
          </h1>

          <LoginWithGoogle />
        </div>
      </div>
    </main>
  );
}
