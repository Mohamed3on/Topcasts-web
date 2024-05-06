'use client';
import AddEpisodeButton from '@/app/AddEpisodeButton';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { Globe, Menu } from 'lucide-react';
import Link from 'next/link';
import { Suspense, useState } from 'react';

const MobileNav = () => {
  const [open, setOpen] = useState(false);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger>
        <Menu />
      </SheetTrigger>
      <SheetContent side={'left'} className="w-[250px] sm:w-[500px]">
        <Button
          className="transition-duration-100 text-base font-bold text-primary transition-colors hover:text-primary/50 "
          asChild
          onClick={() => setOpen(false)}
          variant={'link'}
        >
          <Link href="/">Topcasts</Link>
        </Button>

        <div className="flex flex-col gap-2">
          <Button
            onClick={() => setOpen(false)}
            className=""
            asChild
            variant={'link'}
          >
            <Link
              href="/episodes"
              className="flex items-center justify-start gap-1"
            >
              <Globe className="h-4 w-4" />
              <span>Browse Episodes</span>
            </Link>
          </Button>
          <Suspense>
            <AddEpisodeButton onClick={() => setOpen(false)} />
          </Suspense>
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default MobileNav;
