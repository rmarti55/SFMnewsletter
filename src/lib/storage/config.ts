export type StorageMode = 'postgres' | 'sqlite' | 'ephemeral';

export function usePostgres(): boolean {
  return Boolean(process.env.DATABASE_URL?.trim());
}

export function getStorageMode(): StorageMode {
  if (usePostgres()) return 'postgres';
  if (process.env.VERCEL) return 'ephemeral';
  return 'sqlite';
}

export function assertStorageConfigured(): void {
  if (process.env.VERCEL && !usePostgres()) {
    throw new Error('DATABASE_URL is required on Vercel — SQLite /tmp storage is not supported');
  }
}

export function getStorageBannerMessage(): string | null {
  const mode = getStorageMode();
  if (mode === 'postgres') return null;
  if (mode === 'ephemeral') {
    return 'Production storage is ephemeral — drafts and uploads do not persist until DATABASE_URL is configured.';
  }
  return null;
}

export function isGuidanceReadOnly(): boolean {
  return usePostgres() ? false : Boolean(process.env.VERCEL);
}
