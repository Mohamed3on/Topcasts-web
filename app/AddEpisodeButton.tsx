'use client';
import { AddEpisodeDrawer } from '@/app/AddEpisodeDrawer';
import { useUser } from '@/app/auth/UserContext';

import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import React, { useCallback } from 'react';

const AddEpisodeButton = ({
  children,
  openIfQueryParamExists,
}: {
  children?: React.ReactNode;
  openIfQueryParamExists?: string;
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
  const href = user
    ? `${pathname}?${createQueryString('modal', 'add-episode')}`
    : `/login?${createQueryString('redirect', pathname)}`;

  return user ? (
    <AddEpisodeDrawer openIfQueryParamExists={openIfQueryParamExists}>
      <Button asChild variant="link">
        <Link href={href} className="flex items-center justify-start gap-1">
          {children}
        </Link>
      </Button>
    </AddEpisodeDrawer>
  ) : (
    <Button asChild variant="link">
      <Link href={href} className="flex items-center justify-start gap-1">
        {children}
      </Link>
    </Button>
  );
};

export default AddEpisodeButton;
