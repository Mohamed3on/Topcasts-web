'use client';

import { ImportEpisodeUrl } from '@/app/ImportEpisodeUrl';
import { Drawer, DrawerContent, DrawerTrigger } from '@/components/ui/drawer';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useState } from 'react';

export function AddEpisodeDrawer({ children }: { children?: React.ReactNode }) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(
    searchParams.get('modal') === 'add-episode',
  );

  const closeModal = () => {
    setIsOpen(false);
  };

  const closeAndResetParams = () => {
    closeModal();
    router.push(pathname);
  };

  return (
    <Drawer
      open={isOpen}
      onOpenChange={(open) => {
        open ? setIsOpen(true) : closeAndResetParams();
      }}
    >
      <DrawerTrigger asChild>{children}</DrawerTrigger>

      <DrawerContent className="h-[90%] lg:h-[75%]">
        <ImportEpisodeUrl onSuccessfulSubmit={closeModal} />
      </DrawerContent>
    </Drawer>
  );
}
