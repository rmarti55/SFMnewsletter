'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Button } from '@/components/ui/button';

export function AdminLogoutButton() {
  const pathname = usePathname();
  if (pathname === '/admin/login') return null;

  return (
    <div className="flex justify-end border-b px-4 py-2">
      <form action="/api/auth/logout" method="post">
        <Button type="submit" variant="ghost" size="sm">
          Log out
        </Button>
      </form>
      <Link href="/admin" className="sr-only">
        Admin
      </Link>
    </div>
  );
}
