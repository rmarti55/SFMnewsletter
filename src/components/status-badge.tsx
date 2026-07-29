import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

const statusStyles: Record<string, string> = {
  draft: 'border-[color-mix(in_oklch,var(--warning),transparent_60%)] bg-[color-mix(in_oklch,var(--warning),transparent_85%)] text-[color-mix(in_oklch,var(--warning),var(--foreground)_30%)]',
  sent: 'border-[color-mix(in_oklch,var(--success),transparent_60%)] bg-[color-mix(in_oklch,var(--success),transparent_85%)] text-[color-mix(in_oklch,var(--success),var(--foreground)_20%)]',
};

interface StatusBadgeProps {
  status: string;
  className?: string;
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const normalized = status.toLowerCase();
  return (
    <Badge
      variant="outline"
      className={cn('capitalize', statusStyles[normalized] ?? 'text-muted-foreground', className)}
    >
      {status}
    </Badge>
  );
}
