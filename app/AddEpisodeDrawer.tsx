'use client';

import { ImportEpisodeUrl } from '@/app/ImportEpisodeUrl';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerFooter,
} from '@/components/ui/drawer';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useMediaQuery } from 'usehooks-ts';

export function AddEpisodeDrawer() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const isOpen = searchParams.get('modal') === 'add-episode';

  const closeModal = () => {
    router.push(pathname);
  };

  const isDesktop = useMediaQuery('(min-width: 768px)');

  if (isDesktop) {
    return (
      <Dialog
        open={isOpen}
        onOpenChange={(open) => (open ? null : closeModal())}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Podcast Episode URL</DialogTitle>
          </DialogHeader>

          <ImportEpisodeUrl onSuccessfulSubmit={closeModal} />
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Drawer open={isOpen} onOpenChange={(open) => (open ? null : closeModal())}>
      <DrawerContent>
        <ImportEpisodeUrl onSuccessfulSubmit={closeModal} />
        <DrawerFooter className="pt-2">
          <DrawerClose asChild>
            <Button variant="outline">Cancel</Button>
          </DrawerClose>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}
