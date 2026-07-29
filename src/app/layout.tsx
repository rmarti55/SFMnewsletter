import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Santa Fe Newsletter',
  description: 'Admin newsletter generator',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body style={{ fontFamily: 'system-ui, sans-serif', margin: 0, background: '#fafafa', color: '#111' }}>
        <header style={{ borderBottom: '1px solid #ddd', padding: '12px 20px', background: '#fff' }}>
          <strong>Santa Fe Newsletter</strong>
          <nav style={{ display: 'inline-flex', gap: 16, marginLeft: 24, fontSize: 14 }}>
            <a href="/admin">Generate</a>
            <a href="/admin/drafts">Drafts</a>
            <a href="/admin/guidance">Guidance</a>
          </nav>
        </header>
        <main style={{ maxWidth: 900, margin: '0 auto', padding: 24 }}>{children}</main>
      </body>
    </html>
  );
}
