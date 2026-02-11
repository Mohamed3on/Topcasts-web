import { Button } from '@/components/ui/button';
import { createClient } from '@/utils/supabase/ssr';
import {
  BarChart,
  Flame,
  HeartIcon,
  LogInIcon,
  PlusCircle,
  SearchIcon,
  Share,
} from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import Logout from './logout/LogOutButton';

import AddEpisodeButton from '@/app/AddEpisodeButton';
import MobileNav from '@/app/MobileNav';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';

const Header = async () => {
  const supabase = await createClient();
  const { data: authData } = await supabase.auth.getUser();

  type UserInfo = { username: string; avatar_url: string; name: string };

  let userInfo: UserInfo | null = null;
  if (authData?.user) {
    const { data } = (await (supabase as any)
      .from('profiles')
      .select('username, avatar_url, name')
      .eq('id', authData?.user?.id)
      .single()) as { data: UserInfo | null };

    userInfo = data;
  }

  return (
    <header className="sticky top-0 z-10  mb-8 flex w-full items-center justify-between border-b bg-background/95 px-4 py-2 shadow-sm backdrop-blur supports-[backdrop-filter]:bg-background/60">
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

      <div className="flex items-center gap-4 ">
        <Button className="group hidden md:flex" asChild variant="link">
          <Link href="/episodes" className="flex items-center gap-1">
            <Flame className="h-6 w-6 group-hover:text-orange-600" />

            <span>Browse Top Episodes</span>
          </Link>
        </Button>

        <AddEpisodeButton openIfQueryParamExists="add-episode">
          <PlusCircle className="h-6 w-6" />
          <span className="hidden md:block">Add episode</span>
        </AddEpisodeButton>

        <Button className="group hidden md:flex" asChild variant="link">
          <Link href="/share/setup" className="flex items-center gap-1">
            <Share className="h-5 w-5" />
            <span>Quick Add</span>
          </Link>
        </Button>
      </div>

      <form
        action={async (formData) => {
          'use server';
          const search = formData.get('search');

          const href = `/search${search ? `?q=${search}` : ''}`;
          redirect(href);
        }}
      >
        <div className="relative w-full">
          <Input
            name="search"
            type="search"
            className="w-44 xl:w-96"
            placeholder="Search episodes"
          />

          <button
            type="submit"
            className="absolute right-3 top-1/2 -translate-y-1/2 transform"
          >
            <SearchIcon className="text-muted-foreground" size={18} />
          </button>
        </div>
      </form>

      {userInfo && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="outline"
              className="flex cursor-pointer items-center gap-2 border-none bg-inherit"
            >
              <Image
                width={32}
                height={32}
                src={userInfo.avatar_url || ''}
                alt={userInfo.name || ''}
                className="h-8 w-8 rounded-full"
                referrerPolicy="no-referrer"
              />
              <span className="hidden text-sm font-semibold text-primary/80 lg:block">
                {userInfo.name}
              </span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuItem>
              <Button asChild variant="link" className="">
                <Link
                  className="group flex gap-2"
                  href={`/user/${userInfo.username}/ratings`}
                >
                  <HeartIcon className="h-5 w-5 group-hover:text-red-500" />
                  <span>My Ratings</span>
                </Link>
              </Button>
            </DropdownMenuItem>
            <DropdownMenuItem>
              <Button asChild variant={'link'}>
                <Link
                  href={`/user/${userInfo.username}/podcast/statistics`}
                  className="group flex gap-2"
                >
                  <BarChart className="h-5 w-5 group-hover:text-orange-500" />
                  <span>My Podcast statistics</span>
                </Link>
              </Button>
            </DropdownMenuItem>
            <DropdownMenuItem>
              <Logout />
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )}

      {!authData.user && (
        <Button asChild variant="link">
          <Link href="/login" className="flex  gap-1">
            <LogInIcon className="h-5 w-5" />
            <span>Login</span>
          </Link>
        </Button>
      )}
    </header>
  );
};

export default Header;
