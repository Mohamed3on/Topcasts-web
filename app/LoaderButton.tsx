import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';

export const LoaderButton = ({
  isLoading,
  children,
}: {
  isLoading: boolean;
  children: React.ReactNode;
}) => (
  <Button type="submit" disabled={isLoading}>
    {isLoading ? <Loader2 size={24} className="animate-spin" /> : children}
  </Button>
);
