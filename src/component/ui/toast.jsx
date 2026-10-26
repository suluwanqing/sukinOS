import React, { useState, forwardRef, useImperativeHandle } from 'react';
import { createPortal } from 'react-dom';
import { cva } from 'class-variance-authority';
import { CircleCheckIcon, CircleXIcon, TriangleAlertIcon } from 'lucide-react';
import { cn } from '@/lib/utils';


const icons = {
  success: <CircleCheckIcon />,
  failure: <CircleXIcon />,
  warning: <TriangleAlertIcon />,
  dark: <CircleCheckIcon />,
};

const iconVariants = cva('shrink-0', {
  variants: {
    type: {
      success: 'text-success',
      failure: 'text-destructive',
      warning: 'text-warning',
      dark: 'text-foreground',
    },
  },
  defaultVariants: { type: 'success' },
});

const barVariants = cva(
  'pointer-events-auto flex w-fit max-w-[calc(100vw-2.5rem)] items-center gap-2.5 rounded-full border border-border/70 bg-background/80 px-4.5 py-2 text-sm text-foreground shadow-[0_8px_30px_rgb(0,0,0,0.12)] backdrop-blur-md transition-all duration-200 animate-in fade-in-0 slide-in-from-top-2 dark:border-white/10 dark:bg-background/80 dark:shadow-[0_16px_36px_rgba(0,0,0,0.5)]',
  {
    variants: {
      type: {
        success: '',
        failure: '',
        warning: '',
        dark: 'border-transparent bg-foreground font-semibold text-background',
      },
      multiLine: {
        true: 'items-start text-left rounded-2xl py-3 px-4.5',
        false: '',
      },
    },
    defaultVariants: { type: 'success', multiLine: false },
  },
);

const infoVariants = cva('min-w-0 flex-1 leading-snug tracking-wide', {
  variants: {
    multiLine: {
      true: 'whitespace-normal break-words',
      false: 'truncate',
    },
  },
  defaultVariants: { multiLine: false },
});

const renderSafeInfo = (info) => {
  if (info === null || info === undefined) {
    return '';
  }
  if (typeof info === 'object' && !React.isValidElement(info)) {
    try {
      return JSON.stringify(info);
    } catch {
      return '[无法序列化的对象]';
    }
  }
  return info;
};

const ToastBar = ({ type, info, multiLine }) => (
  <div
    role="alert"
    className={barVariants({ type, multiLine })}
  >
    <span
      className={cn(
        'flex size-[18px] shrink-0 items-center justify-center [&_svg]:size-full',
        iconVariants({ type })
      )}
    >
      {icons[type]}
    </span>
    <span className={infoVariants({ multiLine })}>{renderSafeInfo(info)}</span>
  </div>
);

let nextToastId = 0;

const ToastContainer = forwardRef((props, ref) => {
  const [toasts, setToasts] = useState([]);

  const removeToast = (id) => {
    setToasts((prev) => prev.filter((item) => item.id !== id));
  };

  useImperativeHandle(ref, () => ({
    show: (config) => {
      nextToastId += 1;
      const id = nextToastId;
      const newToast = { ...config, id };

      setToasts((prev) => {
        if (!config.allowMultiple) {
          return [newToast];
        }
        return [...prev, newToast];
      });

      setTimeout(() => {
        removeToast(id);
      }, config.duration);
    },
  }));

  if (toasts.length === 0) return null;

  return createPortal(
    <div className="pointer-events-none fixed left-1/2 top-6 z-[9999] flex -translate-x-1/2 flex-col items-center gap-2.5">
      {toasts.map((item) => (
        <ToastBar key={item.id} {...item} />
      ))}
    </div>,
    document.body
  );
});

const alertRef = React.createRef();

const baseShow = (type, info, options) => {
  alertRef.current?.show({
    type: options?.dark ? 'dark' : type,
    info: info,
    duration: options?.duration ?? 2500,
    multiLine: options?.multiLine ?? false,
    allowMultiple: options?.allowMultiple ?? false,
  });
};

export const alert = {
  success: (info, options) => baseShow('success', info ?? '操作成功!', options),
  failure: (info, options) => baseShow('failure', info ?? '操作失败!', options),
  warning: (info, options) => baseShow('warning', info ?? '警告!', options),
  dark: (info, options) => baseShow('dark', info ?? '通知', { ...options, dark: true }),
};

export default function AlertProvider() {
  return <ToastContainer ref={alertRef} />;
}
