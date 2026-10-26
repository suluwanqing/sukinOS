import { cn } from '@/lib/utils';

export const Loading = ({ text = 'System Loading', className }) => (
  <div
    role="status"
    aria-live="polite"
    className={cn('fixed inset-0 z-[10000] flex items-center justify-center bg-background', className)}
  >
    <div className="relative flex flex-col items-center justify-center">
      <div className="size-[46px] rounded-lg bg-foreground shadow-lg animate-[ui-morph-jump_0.6s_cubic-bezier(0.4,0,0.2,1)_infinite] will-change-transform" />
      <div className="mt-9 h-1 w-10 rounded-full bg-[radial-gradient(ellipse_at_center,rgba(0,0,0,0.15)_0%,rgba(0,0,0,0)_75%)] animate-[ui-shadow-pulse_0.6s_cubic-bezier(0.4,0,0.2,1)_infinite] will-change-[transform,opacity]" />
      <div className="mt-[30px] text-center">
        <span className="mb-3 block text-[11px] font-semibold uppercase tracking-[4px] text-muted-foreground">
          {text}
        </span>
        <div className="mx-auto h-0.5 w-[60px] rounded-full bg-muted" />
      </div>
    </div>
  </div>
);

export default Loading;
