import { useRef, useState, useEffect, KeyboardEvent, ClipboardEvent } from 'react';
import cn from 'classnames';

interface PinCodeInputProps {
  length?: number;
  value: string;
  onChange: (value: string) => void;
  onComplete?: (value: string) => void;
  disabled?: boolean;
  error?: string;
  mask?: boolean;
}

export default function PinCodeInput({
  length = 4,
  value,
  onChange,
  onComplete,
  disabled = false,
  error,
  mask = true,
}: PinCodeInputProps) {
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);
  const [digits, setDigits] = useState<string[]>(Array(length).fill(''));

  useEffect(() => {
    const newDigits = value.split('').slice(0, length);
    while (newDigits.length < length) {
      newDigits.push('');
    }
    setDigits(newDigits);
    
    if (!disabled && typeof window !== 'undefined') {
      const firstEmptyIndex = newDigits.findIndex(d => !d);
      if (firstEmptyIndex !== -1) {
        setTimeout(() => {
          focusInput(firstEmptyIndex);
        }, 100);
      }
    }
  }, [value, length, disabled]);

  const focusInput = (index: number) => {
    if (inputRefs.current[index]) {
      inputRefs.current[index]?.focus();
    }
  };

  const handleChange = (index: number, newValue: string) => {
    if (disabled) return;

    const digit = newValue.replace(/\D/g, '').slice(-1);
    
    const newDigits = [...digits];
    newDigits[index] = digit;
    setDigits(newDigits);

    const fullValue = newDigits.join('');
    onChange(fullValue);

    if (digit && index < length - 1) {
      focusInput(index + 1);
    }

    if (fullValue.length === length && onComplete) {
      setTimeout(() => {
        onComplete(fullValue);
      }, 100);
    }
  };

  const handleKeyDown = (index: number, e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !digits[index] && index > 0) {
      focusInput(index - 1);
    }
    if (e.key === 'ArrowLeft' && index > 0) {
      focusInput(index - 1);
    }
    if (e.key === 'ArrowRight' && index < length - 1) {
      focusInput(index + 1);
    }
  };

  const handlePaste = (e: ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text').replace(/\D/g, '');
    
    if (pastedData.length === length) {
      const newDigits = pastedData.split('');
      setDigits(newDigits);
      onChange(pastedData);
      
      if (onComplete) {
        setTimeout(() => {
          onComplete(pastedData);
        }, 100);
      }
    }
  };

  return (
    <div data-pin-code-container="true" data-no-autofill="true">
      <input
        type="password"
        autoComplete="new-password"
        tabIndex={-1}
        aria-hidden="true"
        style={{
          position: 'absolute',
          left: '-9999px',
          width: '1px',
          height: '1px',
          opacity: 0,
          pointerEvents: 'none',
        }}
        readOnly
      />
      <div className="flex justify-center gap-3">
        {digits.map((digit, index) => {
          const firstEmptyIndex = digits.findIndex(d => !d);
          const isActive = !disabled && !error && index === firstEmptyIndex && firstEmptyIndex !== -1;
          const isFilled = !disabled && digit && !error;
          const isEmpty = !disabled && !digit && !error && !isActive;
          const isReadOnly = !isActive && !isFilled && !disabled;
          
          return (
            <input
              key={index}
              ref={(el) => {
                inputRefs.current[index] = el;
                if (el) {
                  el.setAttribute('autocomplete', 'off');
                  el.setAttribute('data-form-type', 'other');
                  el.setAttribute('data-1p-ignore', 'true');
                  el.setAttribute('data-lpignore', 'true');
                }
              }}
              type="tel"
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={1}
              value={digit}
              onChange={(e) => handleChange(index, e.target.value)}
              onKeyDown={(e) => handleKeyDown(index, e)}
              onPaste={handlePaste}
              onFocus={(e) => {
                const target = e.target as HTMLInputElement;
                target.setAttribute('readonly', 'readonly');
                setTimeout(() => {
                  target.removeAttribute('readonly');
                }, 100);
              }}
              disabled={disabled}
              readOnly={isReadOnly}
              autoComplete="off"
              data-1p-ignore="true"
              data-lpignore="true"
              data-pin-input="true"
              className={cn(
                'h-14 w-14 rounded-lg border-2 text-center text-2xl font-bold',
                'transition-all duration-200 focus:outline-none',
                {
                  'border-black bg-white text-gray-900 dark:bg-white dark:border-black': isActive,
                  'border-gray-300 bg-white text-gray-900 dark:bg-white dark:border-gray-300': isFilled || isEmpty,
                  'border-red-500 bg-red-50 text-red-600 dark:bg-red-50 dark:border-red-500': error,
                  'border-gray-200 bg-gray-100 text-gray-400 cursor-not-allowed dark:bg-gray-200 dark:border-gray-300': disabled,
                }
              )}
            />
          );
        })}
      </div>
      {error && (
        <p className="mt-3 text-center text-sm text-red-600">{error}</p>
      )}
    </div>
  );
}

