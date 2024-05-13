'use client';
import { AddEpisodeDrawer } from '@/app/AddEpisodeDrawer';
import { useUser } from '@/app/auth/UserContext';

import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import React, { useCallback } from 'react';

const AddEpisodeButton = ({
  children,
}: {
  onClick?: () => void;
  children?: React.ReactNode;
}) => {
  const user = useUser();
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
    <AddEpisodeDrawer>
      <Button asChild variant="link">
        <Link
          href={
            user
              ? `${pathname}?${createQueryString('modal', 'add-episode')}`
              : `/login?${createQueryString('redirect', pathname)}`
          }
          className="flex items-center justify-start gap-1"
        >
          {children ? (
            children
          ) : (
            <React.Fragment>
              <Plus className="h-4 w-4" />
              <span>Add episode</span>
            </React.Fragment>
          )}
        </Link>
      </Button>
    </AddEpisodeDrawer>
  );
};

export default AddEpisodeButton;
