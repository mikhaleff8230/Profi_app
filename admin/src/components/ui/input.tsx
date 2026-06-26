import cn from 'classnames';
import React, { InputHTMLAttributes, useState, useEffect, useRef, useImperativeHandle } from 'react';

export interface Props extends InputHTMLAttributes<HTMLInputElement> {
  className?: string;
  inputClassName?: string;
  label?: string;
  note?: string;
  name: string;
  error?: string;
  type?: string;
  shadow?: boolean;
  variant?: 'normal' | 'solid' | 'outline';
  dimension?: 'small' | 'medium' | 'big';
  showLabel?: boolean;
  required?: boolean;
  floatingLabel?: boolean; // Новый проп для floating label
}

const Input = React.forwardRef<HTMLInputElement, Props>(
  (
    {
      className,
      label,
      note,
      name,
      error,
      children,
      variant = 'normal',
      dimension = 'medium',
      shadow = false,
      type = 'text',
      inputClassName,
      disabled,
      showLabel = true,
      required = false,
      floatingLabel = false, // По умолчанию false для обратной совместимости
      value,
      defaultValue,
      ...rest
    },
    ref
  ) => {
    const [isFocused, setIsFocused] = useState(false);
    const [hasValue, setHasValue] = useState(false);
    const internalRef = useRef<HTMLInputElement>(null);
    
    // Объединяем внешний ref и внутренний ref
    useImperativeHandle(ref, () => internalRef.current as HTMLInputElement, []);

    // Определяем, есть ли значение в поле
    useEffect(() => {
      setHasValue(!!(value || defaultValue || internalRef.current?.value));
    }, [value, defaultValue]);

    const isFloating = floatingLabel && (isFocused || hasValue);
    const hasError = !!error;
    const isRequired = required;

    const rootClassName = cn(
      'relative w-full',
      {
        'pt-8': floatingLabel, // Увеличиваем отступ сверху для floating label
      },
      className
    );

    const inputClasses = cn(
      'w-full rounded appearance-none transition-all duration-200 ease-in-out text-heading text-sm focus:outline-none',
      'px-4',
      {
        'h-14': dimension === 'medium', // Увеличиваем высоту для лучших отступов
        'h-12': dimension === 'small',
        'h-16': dimension === 'big',
      },
      {
        'bg-gray-100 border border-border-base focus:shadow focus:bg-light': variant === 'normal',
        'bg-gray-100 border border-border-100 focus:bg-light': variant === 'solid',
        'border border-border-base bg-transparent': variant === 'outline',
      },
      {
        'focus:border-[#232323]': !hasError,
        'border-red-500 focus:border-red-500': hasError || (isRequired && !isFocused && !hasValue),
        'border-[#232323]': isFocused && !hasError,
      },
      {
        'cursor-not-allowed border-[#D4D8DD] bg-[#EEF1F4] select-none': disabled,
      },
      inputClassName
    );

    const labelClasses = cn(
      'absolute left-4 transition-all duration-200 ease-in-out pointer-events-none',
      {
        'top-6 text-sm text-gray-500': !isFloating, // Увеличиваем отступ сверху для label внутри поля
        'top-1 text-xs text-[#232323] font-medium': isFloating, // Label сверху с минимальным отступом
        'text-red-500': hasError || (isRequired && !isFocused && !hasValue),
      }
    );

    const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
      setIsFocused(true);
      rest.onFocus?.(e);
    };

    const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
      setIsFocused(false);
      rest.onBlur?.(e);
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      setHasValue(!!e.target.value);
      rest.onChange?.(e);
    };

    if (floatingLabel) {
      return (
        <div className={rootClassName}>
          <div className="relative">
            {label && (
              <label
                htmlFor={name}
                className={labelClasses}
              >
                {label}
                {required && <span className="text-red-500 ml-1">*</span>}
              </label>
            )}
            <input
              id={name}
              name={name}
              type={type}
              ref={internalRef}
              value={value}
              defaultValue={defaultValue}
              className={cn(inputClasses, {
                'pt-6 pb-3': floatingLabel && !isFloating, // Увеличиваем padding-top когда label внутри поля для лучшего отступа
                'pt-3 pb-3': floatingLabel && isFloating, // Увеличиваем padding когда label сверху
              })}
              autoComplete="off"
              autoCorrect="off"
              autoCapitalize="off"
              spellCheck="false"
              disabled={disabled}
              aria-invalid={hasError ? 'true' : 'false'}
              onFocus={handleFocus}
              onBlur={handleBlur}
              onChange={handleChange}
              {...rest}
            />
          </div>
          {note && <p className="mt-2 text-xs text-body">{note}</p>}
          {error && (
            <p className="mt-2 text-xs text-red-500 text-start flex items-center gap-1">
              <span className="text-red-500">!</span>
              {error}
            </p>
          )}
        </div>
      );
    }

    // Старый стиль для обратной совместимости
    const oldRootClassName = cn(
      'px-4 h-12 flex items-center w-full rounded appearance-none transition duration-300 ease-in-out text-heading text-sm focus:outline-none focus:ring-0',
      {
        'bg-gray-100 border border-border-base focus:shadow focus:bg-light focus:border-[#232323]': variant === 'normal',
        'bg-gray-100 border border-border-100 focus:bg-light focus:border-[#232323]': variant === 'solid',
        'border border-border-base focus:border-[#232323]': variant === 'outline',
      },
      {
        'border-red-500 focus:border-red-500': hasError || (isRequired && !isFocused && !hasValue),
      },
      {
        'focus:shadow': shadow,
      },
      {
        'text-sm h-10': dimension === 'small',
        'h-12': dimension === 'medium',
        'h-14': dimension === 'big',
      },
      {
        'cursor-not-allowed border-[#D4D8DD] bg-[#EEF1F4] select-none': disabled,
      },
      inputClassName
    );

    let numberDisable = type === 'number' && disabled ? 'number-disable' : '';
    return (
      <div className={className}>
        {showLabel ? (
          <label
            htmlFor={name}
            className="mb-3 block text-sm font-semibold leading-none text-body-dark"
          >
            {label}
            {required && <span className="text-red-500 ml-1">*</span>}
          </label>
        ) : (
          ''
        )}
        <input
          id={name}
          name={name}
          type={type}
          ref={internalRef}
          value={value}
          defaultValue={defaultValue}
          className={`${oldRootClassName} ${numberDisable}`}
          autoComplete="off"
          autoCorrect="off"
          autoCapitalize="off"
          spellCheck="false"
          disabled={disabled}
          aria-invalid={hasError ? 'true' : 'false'}
          onFocus={handleFocus}
          onBlur={handleBlur}
          onChange={handleChange}
          {...rest}
        />
        {note && <p className="mt-2 text-xs text-body">{note}</p>}
        {error && (
          <p className="my-2 text-xs text-red-500 text-start">{error}</p>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';

export default Input;
