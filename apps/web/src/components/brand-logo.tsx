import { cn } from '@/lib/utils';

export function BrandLogo({ alt = 'GymOs', className, tone = 'auto' }: BrandLogoProps) {
  return (
    <span className={cn('inline-flex shrink-0 items-center justify-center', className)}>
      <img
        src="/assets/dark-logo.svg"
        alt={alt}
        className={cn('h-full w-full object-contain', tone === 'light' && 'hidden', tone === 'auto' && 'dark:hidden')}
      />
      <img
        src="/assets/white-logo.svg"
        alt={alt}
        className={cn('h-full w-full object-contain', tone === 'dark' && 'hidden', tone === 'auto' ? 'hidden dark:block' : tone === 'light' ? 'block' : 'hidden')}
      />
    </span>
  );
}
