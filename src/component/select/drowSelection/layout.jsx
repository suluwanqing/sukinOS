import { useState, useRef, useEffect } from 'react';
import { createNamespace } from '@/utils/js/classcreate';
import style from './style.module.css';
import { KeyboardArrowDown } from '@mui/icons-material';

const bem = createNamespace('select');

const useClickOutside = (ref, handler) => {
  useEffect(() => {
    const listener = (event) => {
      if (!ref.current || ref.current.contains(event.target)) {
        return;
      }
      handler(event);
    };
    document.addEventListener('mousedown', listener);
    document.addEventListener('touchstart', listener);
    return () => {
      document.removeEventListener('mousedown', listener);
      document.removeEventListener('touchstart', listener);
    };
  }, [ref, handler]);
};

const Select = ({
  value,
  options = [],
  onChange = () => { },
  size = 'default',
  direction = 'bottom',
  placeholder = '请选择',
  boxStyle = {},
  dropdownStyle = {},
  optionStyle = {},
  showTitle=false
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef(null);

  useClickOutside(containerRef, () => setIsOpen(false));

  const handleSelect = (optionValue) => {
    if (optionValue !== value) {
      onChange(optionValue);
    }
    setIsOpen(false);
  };

  const currentOption = options.find(opt => opt.value === value);
  const currentLabel = currentOption ? currentOption.label : value || placeholder;

  return (
    <div
      ref={containerRef}
      className={[
        style[bem.b()],
        style[bem.m(size)],
        style[bem.m(direction)],
        style[bem.is('open', isOpen)]
      ].join(' ')}
    >
      <div
        className={style[bem.e('trigger')]}
        onClick={() => setIsOpen(!isOpen)}
        style={boxStyle}
      >
        <span className={style[bem.e('value')]}>{currentLabel}</span>
        <span className={[
          style[bem.e('arrow')],
          style[bem.is('reverse', isOpen)]
        ].join(' ')}>
          <KeyboardArrowDown fontSize="inherit" />
        </span>
      </div>
      {isOpen && (
        <div
          className={style[bem.e('options')]}
          style={dropdownStyle}
        >
          {options.map((opt) => (
            <div
              key={opt.value}
              className={[
                style[bem.e('option')],
                style[bem.is('selected', opt.value === value)]
              ].join(' ')}
              onClick={() => handleSelect(opt.value)}
              style={optionStyle}
              title={showTitle ? opt.value : ''}
            >
              {opt.label}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Select;
