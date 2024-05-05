import { getHost } from '@/app/utils';
import { Button } from '@/components/ui/button';
import { createClient } from '@/utils/supabase/server';
import { Plus, SearchIcon } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import Logout from './logout/LogOutButton';

import MobileNav from '@/app/MobileNav';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';

const Header = async () => {
  const supabase = createClient();
  const { data } = await supabase.auth.getUser();
  const user = data?.user;

  return (
    <header className="flex items-center justify-between border-b px-4 py-2 shadow-sm">
      <div className="md:hidden">
        <MobileNav />
      </div>

      <Button
        className="hidden text-lg font-bold text-primary transition-colors hover:text-primary/50 md:block"
        asChild
        variant="link"
      >
        <Link href="/">Topcasts</Link>
      </Button>

      <div className=" hidden items-center gap-4 md:flex">
        <Button className="text-sm" asChild variant="link">
          <Link href="/episodes">Browse Episodes</Link>
        </Button>

        <Button asChild variant="link">
          <Link className="flex items-center gap-1" href="/episode/add">
            <Plus className="h-4 w-4" />
            <span>Add an episode</span>
          </Link>
        </Button>
      </div>

      <form
        action={async (formData) => {
          'use server';
          const search = formData.get('search');

          const href = `${getHost()}/episodes${search ? `?q=${search}` : ''}`;
          redirect(href);
        }}
      >
        <div className="relative w-full">
          <Input
            name="search"
            type="search"
            className="w-64 xl:w-96"
            placeholder="Search"
          />

          <button
            type="submit"
            className="absolute right-3 top-1/2 -translate-y-1/2 transform"
          >
            <SearchIcon className="text-muted-foreground" size={18} />
          </button>
        </div>
      </form>

      {user?.user_metadata && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <div className="flex cursor-pointer items-center gap-2">
              <Image
                width={32}
                height={32}
                src={user.user_metadata.avatar_url || ''}
                alt={user.user_metadata.name || ''}
                className="h-8 w-8 rounded-full"
                unoptimized
                referrerPolicy="no-referrer"
              />
              <span className="hidden text-sm font-semibold text-primary/80 lg:block">
                {user.user_metadata.name}
              </span>
            </div>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuItem>
              <Logout />
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )}

      {!user && (
        <Button asChild variant="link">
          <Link href="/login">Login</Link>
        </Button>
      )}
    </header>
  );
};

export default Header;
