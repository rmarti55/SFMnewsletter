import { StorageBanner } from '@/components/storage-banner';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <StorageBanner />
      {children}
    </>
  );
}
