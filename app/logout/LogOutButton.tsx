import { logout } from '@/app/logout/actions';
import { Button } from '@/components/ui/button';
import { LogOutIcon } from 'lucide-react';

export default function LogOut() {
  return (
    <form action={logout}>
      <Button variant={'link'} className="flex gap-1">
        <LogOutIcon className="h-5 w-5" />
        <span>Log Out</span>
      </Button>
    </form>
  );
}
