'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';

const navItems = [
  { href: '/admin', label: 'Generate', match: (path: string) => path === '/admin' },
  { href: '/admin/drafts', label: 'Drafts', match: (path: string) => path.startsWith('/admin/drafts') },
  { href: '/admin/guidance', label: 'Guidance', match: (path: string) => path.startsWith('/admin/guidance') },
];

export function AppHeader() {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-50 border-b border-border/80 bg-card/90 backdrop-blur-md">
      <div className="mx-auto flex max-w-4xl items-center gap-6 px-6 py-3">
        <Link href="/admin" className="group flex items-baseline gap-2">
          <span className="font-heading text-lg font-semibold tracking-tight text-foreground transition-colors group-hover:text-primary">
            Santa Fe Newsletter
          </span>
        </Link>
        <nav className="flex items-center gap-1">
          {navItems.map(({ href, label, match }) => {
            const active = match(pathname);
            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  'rounded-md px-3 py-1.5 text-sm font-medium transition-colors',
                  active
                    ? 'bg-primary/10 text-primary'
                    : 'text-muted-foreground hover:bg-accent hover:text-foreground',
                )}
              >
                {label}
              </Link>
            );
          })}
        </nav>
      </div>
    </header>
  );
}
