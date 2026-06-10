import React, { memo } from 'react';
import style from './style.module.css';
import { createNamespace } from '/utils/js/classcreate';
import LoadingIcon from '@mui/icons-material/Autorenew';

const bem = createNamespace('alert-confirm');

export const AlertConfirm = ({
  visible = false,
  title = '检测到未保存的更改',
  confirmText = '保存更改',
  cancelText = '放弃',
  onConfirm,
  onCancel,
  loading = false,
  icon: Icon = null,
  confirmType = 'primary'
}) => {
  return (
    <div className={[
      style[bem.b()],
      visible ? style[bem.is('visible')] : ''
    ].join(' ')}>
      <div className={style[bem.e('bar-content')]}>
        <span className={style[bem.e('bar-text')]}>{title}</span>
        <div className={style[bem.e('bar-btns')]}>
          <button
            className={[style[bem.e('btn-action')], style[bem.e('btn-cancel')] ].join(' ')}
            onClick={onCancel}
            disabled={loading}
          >
            {cancelText}
          </button>
          <button
            className={[
                style[bem.e('btn-action')],
                style[bem.m(confirmType)]
            ].join(' ')}
            onClick={onConfirm}
            disabled={loading}
          >
            {loading ? <LoadingIcon className={style[bem.e('spin')]} fontSize="inherit" /> : (Icon && <Icon fontSize="inherit" />)}
            {loading ? '正在保存...' : confirmText}
          </button>
        </div>
      </div>
    </div>
  );
};

export default memo(AlertConfirm);
