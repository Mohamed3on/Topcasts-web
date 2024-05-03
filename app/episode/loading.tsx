import { Loader2 } from 'lucide-react';

const Loading = () => {
  return (
    <div className='flex flex-col items-center justify-center h-screen gap-4'>
      <h1 className='text-2xl font-semibold text-center'>Loading...</h1>
      <Loader2 className='h-10 w-10 animate-spin' />
    </div>
  );
};

export default Loading;
