import { StorageBanner } from '@/components/storage-banner';
import { AdminLogoutButton } from '@/components/admin-logout-button';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <StorageBanner />
      <AdminLogoutButton />
      {children}
    </>
  );
}
