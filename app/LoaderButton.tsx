import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';

export const LoaderButton = ({
  isLoading,
  children,
  className,
}: {
  isLoading: boolean;
  children: React.ReactNode;
  className?: string;
}) => (
  <Button type="submit" disabled={isLoading} className={className}>
    {isLoading ? <Loader2 size={24} className="animate-spin" /> : children}
  </Button>
);
