'use client';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { Menu, Plus } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';

const MobileNav = () => {
  const [open, setOpen] = useState(false);
  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger>
        <Menu />
      </SheetTrigger>
      <SheetContent side={'left'} className="w-[200px] sm:w-[500px]">
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
            className="text-sm"
            asChild
            variant={'link'}
          >
            <Link href="/episodes">
              <span>Browse Episodes</span>
            </Link>
          </Button>
          {
            <Button
              onClick={() => setOpen(false)}
              className="text-sm"
              asChild
              variant={'link'}
            >
              <Link href="/episode/add">
                <Plus className="mr-1 h-4 w-4" />
                <span>Add an episode</span>
              </Link>
            </Button>
          }
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default MobileNav;
