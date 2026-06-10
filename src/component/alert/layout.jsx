import React, { useState, useEffect, forwardRef, useImperativeHandle } from 'react';
import { createPortal } from 'react-dom';
import { createNamespace } from '/utils/js/classcreate';
import style from './style.module.css';

const bem = createNamespace('alert');

const SuccessIcon = () => (
  <svg viewBox="0 0 1024 1024" fill="currentColor">
    <path d="M512 0C229.2 0 0 229.2 0 512s229.2 512 512 512 512-229.2 512-512S794.8 0 512 0zm0 960C264.7 960 64 759.3 64 512S264.7 64 512 64s448 200.7 448 448-200.7 448-448 448z" />
    <path d="M748.5 344.2c-12.5-12.5-32.8-12.5-45.3 0L459.2 588.2 320.8 449.8c-12.5-12.5-32.8-12.5-45.3 0s-12.5 32.8 0 45.3l160 160c6.3 6.3 14.5 9.4 22.6 9.4s16.4-3.1 22.6-9.4l272-272c12.5-12.5 12.5-32.8 0-45.3z" />
  </svg>
);

const FailureIcon = () => (
  <svg viewBox="0 0 1024 1024" fill="currentColor">
    <path d="M512 0C229.2 0 0 229.2 0 512s229.2 512 512 512 512-229.2 512-512S794.8 0 512 0zm0 960C264.7 960 64 759.3 64 512S264.7 64 512 64s448 200.7 448 448-200.7 448-448 448z" />
    <path d="M672 352c-12.5-12.5-32.8-12.5-45.3 0L512 466.7 397.3 352c-12.5-12.5-32.8-12.5-45.3 0s-12.5 32.8 0 45.3L466.7 512 352 626.7c-12.5 12.5-12.5 32.8 0 45.3s32.8 12.5 45.3 0L512 557.3l114.7 114.7c12.5 12.5 32.8 12.5 45.3 0s12.5-32.8 0-45.3L557.3 512l114.7-114.7c12.5-12.5 12.5-32.8 0-45.3z" />
  </svg>
);

const WarningIcon = () => (
  <svg viewBox="0 0 1024 1024" fill="currentColor">
    <path d="M512 0C229.2 0 0 229.2 0 512s229.2 512 512 512 512-229.2 512-512S794.8 0 512 0zm0 960C264.7 960 64 759.3 64 512S264.7 64 512 64s448 200.7 448 448-200.7 448-448 448z" />
    <path d="M512 298.7c-17.7 0-32 14.3-32 32v256c0 17.7 14.3 32 32 32s32-14.3 32-32V330.7c0-17.7-14.3-32-32-32zm0 416c-26.5 0-48 21.5-48 48s21.5 48 48 48 48-21.5 48-48-21.5-48-48-48z" />
  </svg>
);

const icons = {
  success: <SuccessIcon />,
  failure: <FailureIcon />,
  warning: <WarningIcon />,
  dark: <SuccessIcon />,
};

const AlertDiY = ({ type, info, multiLine, offset }) => {
  const className = [
    style[bem.b()],
    style[bem.m(type)],
    style[bem.is('multiline', multiLine)],
  ].join(' ').trim();

  return (
    <div className={className} style={{ top: `${offset}px` }}>
      <span className={style[bem.e('icon')]}>{icons[type]}</span>
      <span>{info}</span>
    </div>
  );
};

const AlertContainer = forwardRef((props, ref) => {
  const [alerts, setAlerts] = useState([]);

  const removeAlert = (id) => {
    setAlerts((prev) => prev.filter((item) => item.id !== id));
  };

  useImperativeHandle(ref, () => ({
    show: (config) => {
      const id = Date.now();
      const newAlert = { ...config, id };

      setAlerts((prev) => {
        if (!config.allowMultiple) {
          return [newAlert];
        }
        return [...prev, newAlert];
      });

      setTimeout(() => {
        removeAlert(id);
      }, config.duration);
    },
  }));

  if (alerts.length === 0) return null;

  return createPortal(
    <>
      {alerts.map((item, index) => (
        <AlertDiY
          key={item.id}
          {...item}
          offset={40 + index * 60}
        />
      ))}
    </>,
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
  return <AlertContainer ref={alertRef} />;
}
