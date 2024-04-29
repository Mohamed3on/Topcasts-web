export const dynamic = 'force-dynamic';

export default async function Home() {
  try {
    return (
      <div>
        <div className='w-full flex flex-col items-center gap-2'></div>
      </div>
    );
  } catch (error: any) {
    return (
      <main className='flex min-h-screen flex-col items-center justify-between p-24'>
        <div className='flex flex-col gap-8 items-center justify-center'>
          <h1 className='text-4xl font-bold text-center'>Error</h1>
          <p className='text-lg text-center'>An error occurred. Please try again later.</p>
          {process.env.NODE_ENV === 'development' && <p>{error?.message}</p>}
        </div>
      </main>
    );
  }
}
