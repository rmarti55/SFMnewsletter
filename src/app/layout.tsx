import type { Metadata } from 'next';
import { DM_Sans, Libre_Baskerville } from 'next/font/google';
import { AppHeader } from '@/components/app-header';
import { cn } from '@/lib/utils';
import './globals.css';

const dmSans = DM_Sans({
  subsets: ['latin'],
  variable: '--font-sans',
});

const libreBaskerville = Libre_Baskerville({
  subsets: ['latin'],
  weight: ['400', '700'],
  variable: '--font-heading-family',
});

export const metadata: Metadata = {
  title: 'Santa Fe Newsletter',
  description: 'Admin newsletter generator',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={cn('font-sans', dmSans.variable, libreBaskerville.variable)}>
      <body className="min-h-screen">
        <AppHeader />
        <main className="mx-auto max-w-4xl px-6 py-8">{children}</main>
      </body>
    </html>
  );
}
