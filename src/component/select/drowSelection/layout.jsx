import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { createNamespace } from '/utils/js/classcreate';
import style from './style.module.css';

const bem = createNamespace('select');

const ArrowDownIcon = () => (
  <svg width="1em" height="1em" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{ display: "inline-block", verticalAlign: "middle" }}>
    <polyline points="6 9 12 15 18 9"></polyline>
  </svg>
);

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

export const Select = ({
  value,
  options = [],
  onChange = () => { },
  size = 'default',
  direction = 'bottom',
  placeholder = '请选择',
  boxStyle = {},
  dropdownStyle = {},
  optionStyle = {}
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [hoveredTooltip, setHoveredTooltip] = useState(null);
  const containerRef = useRef(null);

  useClickOutside(containerRef, () => {
    setIsOpen(false);
    setHoveredTooltip(null);
  });

  const handleSelect = (optionValue) => {
    if (optionValue !== value) {
      onChange(optionValue);
    }
    setIsOpen(false);
    setHoveredTooltip(null);
  };

  const handleMouseEnter = (event, text) => {
    if (!text) return;
    const rect = event.currentTarget.getBoundingClientRect();
    setHoveredTooltip({
      text,
      top: window.scrollY + rect.top,
      left: window.scrollX + rect.left + rect.width / 2
    });
  };

  const handleMouseLeave = () => {
    setHoveredTooltip(null);
  };

  useEffect(() => {
    setHoveredTooltip(null);
  }, [isOpen]);

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
        tabIndex={-1}
        onMouseEnter={(e) => handleMouseEnter(e, currentOption ? currentOption.label : undefined)}
        onMouseLeave={handleMouseLeave}
      >
        <span className={style[bem.e('value')]}>{currentLabel}</span>
        <span className={[
          style[bem.e('arrow')],
          style[bem.is('reverse', isOpen)]
        ].join(' ')}>
          <ArrowDownIcon />
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
              onMouseEnter={(e) => handleMouseEnter(e, opt.label)}
              onMouseLeave={handleMouseLeave}
            >
              <span className={style[bem.e('option-text')]}>{opt.label}</span>
            </div>
          ))}
        </div>
      )}

      {hoveredTooltip && createPortal(
        <div
          className={style[bem.e('portal-tooltip')]}
          style={{
            top: `${hoveredTooltip.top}px`,
            left: `${hoveredTooltip.left}px`
          }}
        >
          {hoveredTooltip.text}
        </div>,
        document.body
      )}
    </div>
  );
};

export default Select;
