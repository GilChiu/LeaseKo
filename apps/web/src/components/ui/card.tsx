import { cn } from '@/lib/utils';

interface CardProps {
  children: React.ReactNode;
  title?: string;
  className?: string;
}

export function Card({ children, title, className }: CardProps) {
  return (
    <div
      className={cn(
        'rounded-lg border border-slate-200 bg-white p-6 shadow-sm',
        className,
      )}
    >
      {title && (
        <h3 className="mb-4 text-base font-semibold text-slate-900">{title}</h3>
      )}
      {children}
    </div>
  );
}
