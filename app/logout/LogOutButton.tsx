import { logout } from '@/app/logout/actions';
import { Button } from '@/components/ui/button';

export default function LogOut() {
  return (
    <form action={logout}>
      <Button variant={'link'}>Logout</Button>
    </form>
  );
}
