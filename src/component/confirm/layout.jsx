import React, { useState, useEffect, forwardRef, useImperativeHandle } from 'react';
import { createPortal } from 'react-dom';
import { createNamespace } from '@/utils/js/classcreate';
import style from './style.module.css';

const bem = createNamespace('confirm');

const ConfirmDiY = ({ title, content, onConfirm, onCancel, showInput, inputPlaceholder, inputDefaultValue, children, isVisible, onAnimationEnd }) => {
  const [inputValue, setInputValue] = useState('');

  useEffect(() => {
    setInputValue(inputDefaultValue || '');
  }, [inputDefaultValue]);

  return (
    <div className={`${style[bem.b()]} ${!isVisible ? style[bem.m('closing')] : ''}`}>
      <div className={style[bem.e('mask')]} onClick={onCancel} />
      <div className={style[bem.e('wrapper')]} onAnimationEnd={onAnimationEnd}>
        <div className={style[bem.e('header')]}>
          <h3>{title || '提示'}</h3>
        </div>
        <div className={style[bem.e('body')]}>
          {children || (
            <>
              <p>{content || '确定要执行此操作吗？'}</p>
              {showInput && (
                <input
                  className={style[bem.e('input')]}
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
        <div className={style[bem.e('footer')]}>
          <button className={`${style[bem.e('button')]} ${style[bem.m('cancel')]}`} onClick={onCancel}>
            取消
          </button>
          <button className={`${style[bem.e('button')]} ${style[bem.m('confirm')]}`} onClick={() => onConfirm(inputValue)}>
            确定
          </button>
        </div>
      </div>
    </div>
  );
};

const ConfirmContainer = forwardRef((props, ref) => {
  const [config, setConfig] = useState(null);
  const [isVisible, setIsVisible] = useState(false);

  const handleShow = (newConfig) => {
    setConfig(newConfig);
    setIsVisible(true);
  };

  const handleHide = () => {
    setIsVisible(false);
  };

  const handleAnimationEnd = () => {
    if (!isVisible) {
      setConfig(null);
    }
  };

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
