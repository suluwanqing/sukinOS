import { useState } from 'react';
import { HighlightOff, Visibility, VisibilityOff } from '@mui/icons-material';
import style from "./style.module.css";
import { createNamespace } from '@/utils/js/classcreate';

const bem = createNamespace('admin-form');

const Form = ({
  fields,
  formData,
  errors,
  onInputChange,
  onClear,
  sendCode,
  codeSent,
  countdown
}) => {
  const [showPassword, setShowPassword] = useState(false);

  return (
    <div className={style[bem.b()]}>
      {fields.map((field) => {
        const isPasswordType = field.isPassword;
        const currentType = isPasswordType ? (showPassword ? 'text' : 'password') : field.type;
        const hasValue = formData[field.name] && formData[field.name].length > 0;
        const isCodeType = field.type === 'code';
        return (
          <div key={field.name} className={style[bem.e('form-item')]}>
            <div className={`${style[bem.e('input-wrapper')]} ${errors[field.name] ? style[bem.m('error')] : ''}`}>
              <span className={style[bem.e('prefix-icon')]}>
                {field.icon}
              </span>

              <input
                type={currentType}
                className={style[bem.e('input')]}
                placeholder={field.placeholder}
                value={formData[field.name] || ''}
                maxLength={field.rules?.maxLength}
                minLength={field.rules?.minLength}
                onChange={(e) => onInputChange(field.name, e.target.value)}
              />

              <div className={style[bem.e('suffix')]}>
                {hasValue && !isCodeType && (
                  <span
                    className={style[bem.e('action-icon')]}
                    onClick={() => onClear(field.name)}
                  >
                    <HighlightOff fontSize="small" />
                  </span>
                )}

                {isPasswordType && (
                  <span
                    className={style[bem.e('action-icon')]}
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? <VisibilityOff fontSize="small" /> : <Visibility fontSize="small" />}
                  </span>
                )}

                {isCodeType && (
                  <span
                    className={style[bem.e('code-btn')]}
                    onClick={sendCode}
                    disabled={codeSent && countdown > 0}
                  >
                    {codeSent && countdown > 0 ? `${countdown}s` : '发送验证码'}
                  </span>
                )}
              </div>
            </div>
            {errors[field.name] && (
              <div className={style[bem.e('error-msg')]}>{errors[field.name]}</div>
            )}
          </div>
        );
      })}
    </div>
  );
};

export default Form;
