import { createNamespace } from '/utils/js/classcreate';
import styles from './style.module.css';

const bem = createNamespace('button');

export const Button=({
  children,
  type = 'default',
  size = 'medium',
  plain = false,
  round = false,
  disabled = false,
  loading = false,
  icon,
  iconPosition = 'left',
  className = '',
  ...restProps
})=>{
  const classes = [
    styles[bem.b()],
    type !== 'default' ? styles[bem.b(type)] : '',
    size !== 'medium' ? styles[bem.m(size)] : '',
    styles[bem.is('plain', plain)],
    styles[bem.is('round', round)],
    styles[bem.is('disabled', disabled || loading)],
    styles[bem.is('loading', loading)],
    className,
  ]
    .filter(Boolean)
    .join(' ');

  const renderIcon = () => {
    if (loading) {
      return <span className={styles[bem.e('loading-icon')]}></span>;
    }
    if (icon) {
      return <span className={styles[bem.e('icon')]}>{icon}</span>;
    }
    return null;
  };

  return (
    <button
      className={classes}
      disabled={disabled || loading}
      {...restProps}
    >
      {iconPosition === 'left' && renderIcon()}
      {children && <span className={styles[bem.e('text')]}>{children}</span>}
      {iconPosition === 'right' && renderIcon()}
    </button>
  );
}

export default Button;
