import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { getStorageBannerMessage } from '@/lib/storage/config';

export function StorageBanner() {
  const message = getStorageBannerMessage();
  if (!message) return null;

  return (
    <Alert variant="destructive" className="mb-6">
      <AlertTitle>Storage warning</AlertTitle>
      <AlertDescription>{message}</AlertDescription>
    </Alert>
  );
}
