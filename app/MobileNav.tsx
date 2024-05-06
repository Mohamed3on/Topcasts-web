'use client';
import AddEpisodeButton from '@/app/AddEpisodeButton';
import { User } from '@/app/supabase';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { Globe, Menu, Plus } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';

const MobileNav = ({ user }: { user: User | null }) => {
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
          {user ? (
            <AddEpisodeButton onClick={() => setOpen(false)} />
          ) : (
            <Button onClick={() => setOpen(false)} asChild variant="link">
              <Link
                className="flex items-center justify-start gap-1"
                href="/episode/add"
              >
                <Plus className="h-4 w-4" />
                <span>Add episode</span>
              </Link>
            </Button>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default MobileNav;
