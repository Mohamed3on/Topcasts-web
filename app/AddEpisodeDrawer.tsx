'use client';

import { ImportEpisodeUrl } from '@/app/ImportEpisodeUrl';
import { Drawer, DrawerContent, DrawerTrigger } from '@/components/ui/drawer';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useState } from 'react';

export function AddEpisodeDrawer({ children }: { children?: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [isOpen, setIsOpen] = useState(
    searchParams.get('modal') === 'add-episode',
  );

  const closeModal = () => {
    setIsOpen(false);
  };

  return (
    <Drawer
      open={isOpen}
      onOpenChange={(open) => {
        open ? setIsOpen(true) : closeModal();
      }}
    >
      <DrawerTrigger asChild>{children}</DrawerTrigger>

      <DrawerContent>
        <ImportEpisodeUrl onSuccessfulSubmit={closeModal} />
      </DrawerContent>
    </Drawer>
  );
}
