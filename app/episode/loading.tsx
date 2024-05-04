import { Loader2 } from 'lucide-react';

const Loading = () => {
  return (
    <div className="flex h-screen flex-col items-center justify-center gap-4">
      <h1 className="text-center text-2xl font-semibold">Loading Episode...</h1>
      <Loader2 className="h-10 w-10 animate-spin" />
    </div>
  );
};

export default Loading;
