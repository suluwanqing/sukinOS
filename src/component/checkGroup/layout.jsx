import React, { useState, useEffect, useMemo, useCallback } from 'react';
import Check from '../check/layout';
import { createNamespace } from '@/utils/js/classcreate';
import style from './style.module.css';

const bem = createNamespace('check-group');

function CheckGroup(props) {
  const {
    value,
    onChange,
    options = [],
    type = 'default',
    size = 'medium',
    plain = false,
    round = false,
    disabled = false,
    mode = 'multiple',
    min,
    max,
    className = '',
    style: customStyle = {}
  } = props;

  const isControlled = value !== undefined;
  const [internalValue, setInternalValue] = useState(() => (isControlled ? (value ?? []) : []));

  useEffect(() => {
    if (isControlled) {
      setInternalValue(value ?? []);
    }
  }, [value, isControlled]);

  const normalizedOptions = useMemo(() => {
    return options.map((opt, idx) => {
      if (typeof opt === 'string' || typeof opt === 'number') {
        return {
          value: opt,
          label: String(opt),
          disabled: false,
          type,
          size,
          plain,
          round
        };
      }
      return {
        value: opt.value,
        label: opt.label ?? opt.value,
        disabled: !!opt.disabled,
        type: opt.type ?? type,
        size: opt.size ?? size,
        plain: opt.plain !== undefined ? opt.plain : plain,
        round: opt.round !== undefined ? opt.round : round
      };
    });
  }, [options, type, size, plain, round]);

  const currentValues = useMemo(() => {
    return isControlled ? (value ?? []) : internalValue;
  }, [isControlled, value, internalValue]);

  const validatedValues = useMemo(() => {
    let result = Array.isArray(currentValues) ? [...currentValues] : [];
    if (mode === 'single') {
      result = result.slice(0, 1);
    }
    if (max !== undefined && mode === 'multiple' && result.length > max) {
      result = result.slice(0, max);
    }
    return result;
  }, [currentValues, mode, max]);

  useEffect(() => {
    if (!isControlled) {
      const a = internalValue || [];
      const b = validatedValues || [];
      const same = a.length === b.length && a.every((v, i) => Object.is(v, b[i]));
      if (!same) {
        setInternalValue(validatedValues);
      }
    }
  }, [validatedValues, isControlled, internalValue]);

  const isChecked = useCallback(
    (val) => {
      return validatedValues.includes(val);
    },
    [validatedValues]
  );

  const isDisabledOption = useCallback(
    (optionObj) => {
      const optionValue = optionObj.value;
      const optionDisabled = !!optionObj.disabled;
      const optionIsChecked = isChecked(optionValue);

      if (disabled) return true;
      if (optionDisabled) return true;

      if (mode === 'multiple') {
        if (optionIsChecked) {
          if (min !== undefined && validatedValues.length <= min) return true;
        } else {
          if (max !== undefined && validatedValues.length >= max) return true;
        }
      } else if (mode === 'single') {
        if (optionIsChecked && min === 1) return true;
      }

      return false;
    },
    [disabled, isChecked, mode, min, max, validatedValues.length]
  );

  const handleCheckChange = useCallback(
    (optionValue, checked) => {
      let newValues = [];
      const currentlyChecked = isChecked(optionValue);

      if (mode === 'single') {
        newValues = checked ? [optionValue] : [];
        if (!checked && min === 1) return;
      } else {
        const base = Array.isArray(currentValues) ? [...currentValues] : [];
        if (checked) {
          if (!base.includes(optionValue)) base.push(optionValue);
          if (max !== undefined && base.length > max) return;
          newValues = base;
        } else {
          newValues = base.filter((v) => !Object.is(v, optionValue));
          if (min !== undefined && newValues.length < min) return;
        }
      }

      if (isControlled) {
        onChange?.(newValues);
      } else {
        setInternalValue(newValues);
        onChange?.(newValues);
      }
    },
    [currentValues, isChecked, isControlled, max, min, mode, onChange]
  );

  const getLimitText = useCallback(() => {
    if (mode === 'single') return null;
    const parts = [];
    if (min !== undefined) parts.push(`至少选择${min}个`);
    if (max !== undefined) parts.push(`最多选择${max}个`);
    if (parts.length === 0) return null;
    return parts.join('，');
  }, [mode, min, max]);

  const onItemClick = useCallback(
    (optionObj) => {
      const disabledOption = isDisabledOption(optionObj);
      if (disabledOption) return;
      const val = optionObj.value;
      const currently = isChecked(val);
      handleCheckChange(val, !currently);
    },
    [handleCheckChange, isChecked, isDisabledOption]
  );

  return (
    <div
      className={`${style[bem.b()]} ${className}`}
      style={customStyle}
      data-mode={mode}
      role="group"
      aria-disabled={disabled}
    >
      {normalizedOptions.map((option, index) => {
        const optionValue = option.value;
        const checked = isChecked(optionValue);
        const optionDisabled = isDisabledOption(option);
        const key = optionValue ?? index;

        const itemClass = [
          style[bem.e('item')],
          style[bem.is('disabled', optionDisabled)],
          style[bem.is('checked', checked)]
        ].filter(Boolean).join(' ');

        return (
          <div
            key={key}
            className={itemClass}
            onClick={() => onItemClick(option)}
            role="button"
            tabIndex={optionDisabled ? -1 : 0}
          >
            <Check
              checked={checked}
              onChange={(c) => handleCheckChange(optionValue, c)}
              type={option.type}
              size={option.size}
              plain={option.plain}
              round={option.round}
              disabled={optionDisabled}
            />
            <span className={style[bem.e('label')]}>
              {option.label}
            </span>
          </div>
        );
      })}

      {getLimitText() && (
        <div className={style[bem.e('limit-info')]}>
          {getLimitText()}（已选择 {validatedValues.length} 个）
        </div>
      )}
    </div>
  );
}

export default CheckGroup;
