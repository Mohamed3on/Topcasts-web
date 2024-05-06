'use client';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import { useCallback } from 'react';

const AddEpisodeButton = ({ onClick }: { onClick?: () => void }) => {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const createQueryString = useCallback(
    (name: string, value: string) => {
      const params = new URLSearchParams(searchParams.toString());
      params.set(name, value);

      return params.toString();
    },
    [searchParams],
  );
  return (
    <Button asChild variant="link" onClick={onClick}>
      <Link
        href={`${pathname}?${createQueryString('modal', 'add-episode')}`}
        className="flex items-center justify-start gap-1"
      >
        <Plus className="h-4 w-4" />
        <span>Add episode</span>
      </Link>
    </Button>
  );
};

export default AddEpisodeButton;
