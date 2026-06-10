import { useState, forwardRef } from 'react';
import { createNamespace } from '/utils/js/classcreate';
import styles from './style.module.css';
const bem = createNamespace('input');
export const Input = forwardRef((
  {
    value,
    defaultValue,
    onChange,
    size = 'medium',
    disabled = false,
    clearable = false,
    showPassword = false,
    prefixIcon,
    suffixIcon,
    maxLength,
    minLength,
    className = '',
    style = {},
    isRound=false,
    ...restProps
  },
  ref
) => {
  const [passwordVisible, setPasswordVisible] = useState(false);

  const inputType =
    restProps.type === 'password' && showPassword && passwordVisible
      ? 'text'
      : restProps.type;

  const wrapperClasses = [
    styles[bem.b()],
    size !== 'medium' ? styles[bem.m(size)] : '',
    styles[bem.is('disabled', disabled)],
    styles[bem.is('prepend', !!prefixIcon)],
    styles[bem.is('append', !!suffixIcon || clearable || (showPassword && restProps.type === 'password'))],
    styles[bem.is('round',isRound)],
    className,
  ]
    .filter(Boolean)
    .join(' ');

  const handleClear = (e) => {
    if (onChange) {
      const event = Object.create(e);
      event.target = { ...e.target, value: '' };
      onChange(event);
    }
  };

  const renderSuffix = () => {
    if (suffixIcon) {
      return <span className={styles[bem.e('suffix')]}>{suffixIcon}</span>;
    }

    if (restProps.type === 'password' && showPassword) {
      const PasswordIcon = passwordVisible ? (
        <svg viewBox="0 0 1024 1024" width="1em" height="1em"><path d="M512 384a128 128 0 1 0 0 256 128 128 0 0 0 0-256zm0 192a64 64 0 1 1 0-128 64 64 0 0 1 0 128z" fill="currentColor"></path><path d="M512 128c-278.6 0-506.7 217.5-512 224v96c5.3 6.5 233.4 224 512 224s506.7-217.5 512-224v-96c-5.3-6.5-233.4-224-512-224zm0 448c-198.8 0-379.4-142.1-443.7-192 64.3-49.9 244.9-192 443.7-192s379.4 142.1 443.7 192c-64.3 49.9-244.9-192-443.7-192z" fill="currentColor"></path></svg>
      ) : (
        <svg viewBox="0 0 1024 1024" width="1em" height="1em"><path d="M512 384a128 128 0 1 0 0 256 128 128 0 0 0 0-256zm0 192a64 64 0 1 1 0-128 64 64 0 0 1 0 128z" fill="currentColor"></path><path d="M928.2 338.3c-29.4-42.8-68.9-81.1-116.3-112.8-49.2-32.9-105.7-58.3-166.5-74.6-61.9-16.6-126.9-24.9-192.2-24.9s-130.3 8.3-192.2 24.9c-60.8 16.3-117.3-41.7-166.5-74.6-47.4-31.7-86.9-70-116.3-112.8C59.2 385.2 32 445.8 32 512c0 66.2 27.2 126.8 71.8 173.7 29.4 42.8 68.9 81.1 116.3 112.8 49.2 32.9 105.7 58.3 166.5 74.6 61.9 16.6 126.9 24.9 192.2 24.9s130.3-8.3 192.2-24.9c60.8-16.3 117.3-41.7 166.5-74.6 47.4-31.7 86.9-70 116.3-112.8C964.8 638.8 992 578.2 992 512c0-66.2-27.2-126.8-71.8-173.7zM512 704c-106 0-192-86-192-192s86-192 192-192 192 86 192 192-86 192-192 192z" fill="currentColor"></path></svg>
      );
      return (
        <span className={styles[bem.e('suffix')]} onClick={() => setPasswordVisible(!passwordVisible)}>
          <span className={styles[bem.e('password-toggle')]}>{PasswordIcon}</span>
        </span>
      );
    }

    const hasValue = (value !== undefined && value !== null && value !== '') ||
                     (defaultValue !== undefined && defaultValue !== null && defaultValue !== '');

    if (clearable && hasValue && !disabled) {
      const ClearIcon = <svg viewBox="0 0 1024 1024" width="1em" height="1em"><path d="M512 64C264.6 64 64 264.6 64 512s200.6 448 448 448 448-200.6 448-448S759.4 64 512 64zm165.4 618.2c4.7 4.7 4.7 12.3 0 17L638 738.6c-4.7 4.7-12.3 4.7-17 0L512 629.4l-109.4 109.4c-4.7 4.7-12.3 4.7-17 0L346.2 699c-4.7-4.7-4.7-12.3 0-17L455.6 572.6 346.2 463.2c-4.7-4.7-4.7-12.3 0-17L385.6 407c4.7-4.7 12.3-4.7 17 0L512 516.4l109.4-109.4c4.7-4.7 12.3-4.7 17 0L677.8 446c4.7 4.7 4.7 12.3 0 17L568.4 572.6l109.4 109.6z" fill="currentColor"></path></svg>;
      return (
        <span className={styles[bem.e('suffix')]} onMouseDown={handleClear}>
          <span className={styles[bem.e('clear')]}>{ClearIcon}</span>
        </span>
      );
    }

    return null;
  };

  return (
    <div className={wrapperClasses}>
      {prefixIcon && <span className={styles[bem.e('prefix')]}>{prefixIcon}</span>}
      <input
        style={{ ...style }}
        ref={ref}
        value={value}
        defaultValue={defaultValue}
        onChange={onChange}
        className={styles[bem.e('inner')]}
        disabled={disabled}
        maxLength={maxLength}
        minLength={minLength}
        {...restProps}
        type={inputType}
      />
      {renderSuffix()}
    </div>
  );
});

export default Input;
