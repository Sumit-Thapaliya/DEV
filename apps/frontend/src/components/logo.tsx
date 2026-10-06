import { cn } from '@/lib/utils';

function Mark() {
  return (
    <svg viewBox="0 0 48 48" aria-hidden="true" className="h-full w-full">
      <rect
        x="1"
        y="1"
        width="46"
        height="46"
        rx="12"
        style={{ fill: 'hsl(var(--primary))' }}
      />
      <path
        d="M15 11h13l5 5v17a4 4 0 0 1-4 4H15a4 4 0 0 1-4-4V15a4 4 0 0 1 4-4Z"
        fill="#FFFFFF"
      />
      <path d="M28 11v5h5Z" fill="#D9E2FF" />
      <rect x="17" y="20" width="10" height="2.4" rx="1.2" fill="#C6D1FA" />
      <rect x="17" y="25" width="15" height="2.4" rx="1.2" fill="#DDE4FF" />
      <rect x="17" y="30" width="8" height="2.4" rx="1.2" fill="#DDE4FF" />
      <circle
        cx="32.5"
        cy="31.5"
        r="7.5"
        style={{ fill: 'hsl(var(--success))' }}
      />
      <path
        d="M28.9 31.7l2.5 2.5 4.7-4.7"
        stroke="#FFFFFF"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    </svg>
  );
}

export interface LogoProps {
  variant?: 'dark' | 'light';
  size?: number;
  showTagline?: boolean;
  className?: string;
}

export function Logo({
  variant = 'dark',
  size = 40,
  showTagline = true,
  className,
}: LogoProps) {
  return (
    <span className={cn('inline-flex items-center gap-2.5', className)}>
      <span
        className="inline-block shrink-0"
        style={{ width: size, height: size }}
      >
        <Mark />
      </span>
      <span className="flex flex-col leading-none">
        <span
          className={cn(
            'text-xl font-bold tracking-tight',
            variant === 'light' ? 'text-white' : 'text-foreground',
          )}
        >
          Job
          <span
            className={variant === 'light' ? 'text-primary-light' : 'text-primary'}
          >
            Dev
          </span>
        </span>
        {showTagline && (
          <span
            className={cn(
              'mt-1 text-[11px] font-medium',
              variant === 'light' ? 'text-white/70' : 'text-muted-foreground',
            )}
          >
            Get hired faster
          </span>
        )}
      </span>
    </span>
  );
}
