import { cn } from '@/lib/utils';
import type { Provider } from '@/lib/types';

interface ProviderBadgeProps {
  provider: Provider;
  model: string;
  className?: string;
  showModel?: boolean;
}

const PROVIDER_STYLES: Record<Provider, string> = {
  openai: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400',
  anthropic: 'bg-violet-100 text-violet-700 dark:bg-violet-950 dark:text-violet-400',
  google: 'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-400',
};

const PROVIDER_LABELS: Record<Provider, string> = {
  openai: 'OpenAI',
  anthropic: 'Anthropic',
  google: 'Google',
};

export function ProviderBadge({ provider, model, className, showModel = true }: ProviderBadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium',
        PROVIDER_STYLES[provider],
        className
      )}
    >
      {showModel ? `${PROVIDER_LABELS[provider]} / ${model}` : PROVIDER_LABELS[provider]}
    </span>
  );
}

export function ProviderDot({ provider, className }: { provider: Provider; className?: string }) {
  const dotColors: Record<Provider, string> = {
    openai: 'bg-emerald-500',
    anthropic: 'bg-violet-500',
    google: 'bg-blue-500',
  };

  return <span className={cn('size-2 rounded-full', dotColors[provider], className)} />;
}
