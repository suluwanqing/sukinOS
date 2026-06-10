import { useState } from 'react';
import { HighlightOff, Visibility, VisibilityOff } from '@mui/icons-material';
import style from "./style.module.css";
import { createNamespace } from '/utils/js/classcreate';

const bem = createNamespace('sukinos-form');

const Form = ({ fields, formData, errors, onInputChange, onClear, sendCode, countdown, isSending }) => {
  const [showPassword, setShowPassword] = useState(false);

  return (
    <div className={style[bem.b()]}>
      {fields.map((field) => {
        const isCode = field.name === 'code';
        const isPass = field.isPassword;

        return (
          <div key={field.name} className={style[bem.e('form-item')]}>
            <div className={`${style[bem.e('input-wrapper')]} ${errors[field.name] ? style[bem.m('error')] : ''}`}>
              <span className={style[bem.e('prefix-icon')]}>{field.icon}</span>
              <input
                type={isPass && !showPassword ? 'password' : 'text'}
                className={style[bem.e('input')]}
                placeholder={field.placeholder}
                value={formData[field.name] || ''}
                autoComplete="off"
                maxLength={field.rules?.maxLength}
                onChange={(e) => onInputChange(field.name, e.target.value)}
              />
              <div className={style[bem.e('suffix')]}>
                {isPass && (
                  <span className={style[bem.e('action-icon')]} onClick={() => setShowPassword(!showPassword)}>
                    {showPassword ? <VisibilityOff fontSize="small"/> : <Visibility fontSize="small"/>}
                  </span>
                )}
                {isCode && (
                  <span
                    className={style[bem.e('code-btn')]}
                    onClick={(countdown > 0 || isSending) ? null : sendCode}
                    data-disabled={countdown > 0 || isSending}
                  >
                    {isSending ? 'SENDING...' : (countdown > 0 ? `${countdown}s WAIT` : 'SEND CODE')}
                  </span>
                )}
                {!isCode && !isPass && formData[field.name] && (
                  <span className={style[bem.e('action-icon')]} onClick={() => onClear(field.name)}>
                    <HighlightOff fontSize="small"/>
                  </span>
                )}
              </div>
            </div>
            {errors[field.name] && <div className={style[bem.e('error-msg')]}>{errors[field.name]}</div>}
          </div>
        );
      })}
    </div>
  );
};

export default Form;
