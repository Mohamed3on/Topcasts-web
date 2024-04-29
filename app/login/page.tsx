import { LoginWithGoogle } from '@/app/login/LoginWithGoogle';

export default function Login() {
  return (
    <main className='flex min-h-screen flex-col items-center justify-center p-8'>
      <div className='w-full bg-white rounded-lg shadow dark:border md:mt-0 sm:max-w-md xl:p-0 dark:bg-gray-800 dark:border-gray-700'>
        <div className='p-6 space-y-4 md:space-y-6 sm:p-8'>
          <h1 className='text-xl font-bold leading-tight tracking-tight text-gray-900 md:text-2xl dark:text-white'>
            Speak thy secret word!
          </h1>

          <LoginWithGoogle />
        </div>
      </div>
    </main>
  );
}
