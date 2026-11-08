import React, { useState, useEffect, useRef, forwardRef, useImperativeHandle } from 'react';
import { createPortal } from 'react-dom';
import { cva } from 'class-variance-authority';
import { Button } from './button';
import { Input } from './input';


const overlayVariants = cva(
  'pointer-events-auto absolute inset-0 bg-black/50',
  {
    variants: {
      visible: {
        true: 'animate-in fade-in-0 duration-200',
        false: 'animate-out fade-out-0 duration-150 fill-mode-forwards opacity-0 pointer-events-none',
      },
    },
    defaultVariants: { visible: false },
  },
);

const cardVariants = cva(
  'pointer-events-auto relative w-full max-w-[380px] overflow-hidden rounded-lg border border-border bg-background text-sm text-foreground shadow-lg',
  {
    variants: {
      visible: {
        true: 'animate-in fade-in-0 zoom-in-95 duration-200',
        false: 'animate-out fade-out-0 zoom-out-95 duration-150 fill-mode-forwards opacity-0 pointer-events-none',
      },
    },
    defaultVariants: { visible: false },
  },
);

const ConfirmDiY = ({
  title,
  content,
  onConfirm,
  onCancel,
  showInput,
  inputPlaceholder,
  inputDefaultValue,
  children,
  isVisible,
  onAnimationEnd,
  showCancel = true,
  confirmText = '确定',
  cancelText = '取消'
}) => {
  const [inputValue, setInputValue] = useState('');

  useEffect(() => {
    setInputValue(inputDefaultValue || '');
  }, [inputDefaultValue]);

  return (
    <div className={`fixed inset-0 z-[10000] flex items-center justify-center p-5 max-[767px]:p-3 ${isVisible ? 'pointer-events-auto' : 'pointer-events-none'}`}>
      <div
        className={overlayVariants({ visible: isVisible })}
        onClick={showCancel ? onCancel : undefined}
      />
      <div
        className={cardVariants({ visible: isVisible })}
        onAnimationEnd={onAnimationEnd}
      >
        <div className="px-5 pt-5 pb-2.5 max-[767px]:px-4 max-[767px]:pt-4 max-[767px]:pb-1.5">
          <h3 className="m-0 text-lg font-semibold tracking-[-0.01em] text-foreground max-[767px]:text-base">{title || '提示'}</h3>
        </div>
        <div className="px-5 pb-5 text-sm leading-normal max-[767px]:px-4 max-[767px]:pb-4">
          {children || (
            <>
              <p className="m-0 text-muted-foreground">{content || '确定要执行此操作吗？'}</p>
              {showInput && (
                <Input
                  className="mt-4"
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  placeholder={inputPlaceholder || ''}
                  autoFocus
                  onKeyDown={(e) => e.key === 'Enter' && onConfirm(inputValue)}
                />
              )}
            </>
          )}
        </div>
        <div className={`grid gap-3 px-5 pb-5 max-[767px]:gap-2 max-[767px]:px-4 max-[767px]:pb-4 ${showCancel ? 'grid-cols-2' : 'grid-cols-1'}`}>
          {showCancel && (
            <Button onClick={onCancel}>{cancelText}</Button>
          )}
          <Button variant="default" onClick={() => onConfirm(inputValue)}>
            {confirmText}
          </Button>
        </div>
      </div>
    </div>
  );
};

const ConfirmContainer = forwardRef((props, ref) => {
  const [config, setConfig] = useState(null);
  const [isVisible, setIsVisible] = useState(false);
  const unmountTimer = useRef(null);

  const clearUnmountTimer = () => {
    if (unmountTimer.current) {
      clearTimeout(unmountTimer.current);
      unmountTimer.current = null;
    }
  };

  const unmount = () => {
    clearUnmountTimer();
    setConfig(null);
  };

  const handleShow = (newConfig) => {
    clearUnmountTimer();
    setConfig(newConfig);
    setIsVisible(true);
  };

  const handleHide = () => {
    setIsVisible(false);
    clearUnmountTimer();
    unmountTimer.current = setTimeout(unmount, 200);
  };

  const handleAnimationEnd = (e) => {
    if (e.target !== e.currentTarget) return;
    if (!isVisible) {
      unmount();
    }
  };

  useEffect(() => {
    return () => clearUnmountTimer();
  }, []);

  useImperativeHandle(ref, () => ({
    show: handleShow,
    hide: handleHide,
  }));

  if (!config) {
    return null;
  }

  return createPortal(
    <ConfirmDiY
      {...config}
      isVisible={isVisible}
      onAnimationEnd={handleAnimationEnd}
      onConfirm={(inputValue) => {
        config.onConfirm?.(inputValue);
        handleHide();
      }}
      onCancel={() => {
        config.onCancel?.();
        handleHide();
      }}
    />,
    document.body
  );
});

const confirmRef = React.createRef();

export const confirm = {
  show: (config) => {
    confirmRef.current?.show(config);
  },
  hide: () => {
    confirmRef.current?.hide();
  }
};

export default function ConfirmProvider() {
  return <ConfirmContainer ref={confirmRef} />;
}
