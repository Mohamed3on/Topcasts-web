'use client';

import { ImportEpisodeUrl } from '@/app/ImportEpisodeUrl';
import { Drawer, DrawerContent, DrawerTrigger } from '@/components/ui/drawer';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useState } from 'react';

export function AddEpisodeDrawer({
  children,
  openIfQueryParamExists,
}: {
  children?: React.ReactNode;
  openIfQueryParamExists?: string;
}) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const [isSuccess, setIsSuccess] = useState(false);
  const [isOpen, setIsOpen] = useState(
    searchParams.get('modal') === openIfQueryParamExists,
  );

  const closeModal = (removeQueryParam = true) => {
    setIsOpen(false);
    // this is all a hack because we can't await navigation in next/navigation. So this would
    // override/cancel any navigation in progress.
    // https://stackoverflow.com/questions/76253446/await-navigation-with-router-from-next-navigation

    // basically we want to remove the query param if the drawer is closed and an episode was not
    // added, but not if the episode was added successfully because that already navigates away
    if (removeQueryParam && !isSuccess) {
      router.push(pathname);
    }
  };

  const onSuccessfulSubmit = () => {
    setIsSuccess(true);
    closeModal(false);
  };

  return (
    <Drawer open={isOpen} onOpenChange={setIsOpen} onClose={closeModal}>
      <DrawerTrigger asChild>{children}</DrawerTrigger>

      <DrawerContent className="h-[90%] lg:h-[75%]">
        <ImportEpisodeUrl onSuccessfulSubmit={onSuccessfulSubmit} />
      </DrawerContent>
    </Drawer>
  );
}
