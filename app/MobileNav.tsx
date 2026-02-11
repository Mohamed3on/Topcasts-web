'use client';
import { useUser } from '@/app/auth/UserContext';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { BarChart, Flame, Menu, Share } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';

const MobileNav = () => {
  const [open, setOpen] = useState(false);
  const user = useUser();

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
            <Link href="/episodes" className="group flex items-center gap-1">
              <Flame className="h-6 w-6 group-hover:text-orange-600" />

              <span>Browse Top Episodes</span>
            </Link>
          </Button>
          <Button
            onClick={() => setOpen(false)}
            className=""
            asChild
            variant={'link'}
          >
            <Link href="/share/setup" className="group flex items-center gap-1">
              <Share className="h-6 w-6 group-hover:text-blue-600" />
              <span>Quick Add</span>
            </Link>
          </Button>
          {user && (
            <>
              <Button
                onClick={() => setOpen(false)}
                className=""
                asChild
                variant={'link'}
              >
                <Link
                  href={`/user/${user.username}/ratings`}
                  className="group flex items-center gap-1"
                >
                  <Flame className="h-6 w-6 group-hover:text-orange-600" />

                  <span>My ratings</span>
                </Link>
              </Button>

              <Button
                onClick={() => setOpen(false)}
                className=""
                asChild
                variant={'link'}
              >
                <Link
                  href={`/user/${user.username}/podcast/statistics`}
                  className="group flex items-center gap-1"
                >
                  <BarChart className="h-6 w-6 group-hover:text-orange-600" />

                  <span>My Podcast statistics</span>
                </Link>
              </Button>
            </>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default MobileNav;
