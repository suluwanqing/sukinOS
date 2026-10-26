import React, { useState, useEffect, useMemo, useCallback } from 'react';
import Check from './switch';
import { cn } from '@/lib/utils';


const toSafeArray = (v) => {
  if (Array.isArray(v)) return v;
  if (v !== undefined && v !== null && v !== '') return [v];
  return [];
};

export const CheckGroup = (props) => {
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
  const [internalValue, setInternalValue] = useState(() => (isControlled ? toSafeArray(value) : []));

  useEffect(() => {
    if (isControlled) {
      setInternalValue(toSafeArray(value));
    }
  }, [value, isControlled]);

  const normalizedOptions = useMemo(() => {
    return options.map((opt) => {
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
    return toSafeArray(isControlled ? value : internalValue);
  }, [isControlled, value, internalValue]);

  const validatedValues = useMemo(() => {
    let result = [...currentValues];
    if (mode === 'single') {
      result = result.slice(0, 1);
    }
    if (max !== undefined && mode === 'multiple' && result.length > max) {
      result = result.slice(0, max);
    }
    return result;
  }, [currentValues, mode, max]);

  const isChecked = useCallback(
    (val) => {
      return validatedValues.some(item => Object.is(item, val));
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

      if (mode === 'single') {
        newValues = checked ? [optionValue] : [];
        if (!checked && min === 1) return;
      } else {
        const base = [...currentValues];
        if (checked) {
          if (!base.some(item => Object.is(item, optionValue))) base.push(optionValue);
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
    [currentValues, isControlled, max, min, mode, onChange]
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
      className={cn('flex flex-col gap-2.5', className)}
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

        return (
          <div
            key={key}
            className={cn(
              'flex select-none items-center gap-2 py-0.5 text-sm outline-none transition-colors duration-150',
              optionDisabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer',
              checked ? 'text-primary' : 'text-muted-foreground',
              !optionDisabled && 'hover:text-foreground focus-visible:text-foreground'
            )}
            onClick={() => onItemClick(option)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onItemClick(option);
              }
            }}
            role="checkbox"
            aria-checked={checked}
            aria-disabled={optionDisabled}
            tabIndex={optionDisabled ? -1 : 0}
          >
            <div className="pointer-events-none shrink-0 flex items-center justify-center">
              <Check
                checked={checked}
                type={option.type}
                size={option.size}
                plain={option.plain}
                round={option.round}
                disabled={optionDisabled}
              />
            </div>
            <span className={cn('truncate', checked ? 'font-medium text-foreground' : '')}>
              {option.label}
            </span>
          </div>
        );
      })}

      {getLimitText() && (
        <div className="mt-1 border-t border-dashed border-border/70 pt-1.5 text-right text-xs text-muted-foreground">
          {getLimitText()}（已选择 {validatedValues.length} 个）
        </div>
      )}
    </div>
  );
};

export default CheckGroup;
