import { useRef, useState, useEffect, KeyboardEvent, ClipboardEvent } from 'react';
import cn from 'classnames';

interface OtpCodeInputProps {
  length?: number;
  value: string;
  onChange: (value: string) => void;
  onComplete?: (value: string) => void;
  disabled?: boolean;
  error?: string;
}

export default function OtpCodeInput({
  length = 6,
  value,
  onChange,
  onComplete,
  disabled = false,
  error,
}: OtpCodeInputProps) {
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);
  const [digits, setDigits] = useState<string[]>(Array(length).fill(''));

  useEffect(() => {
    const newDigits = value.split('').slice(0, length);
    while (newDigits.length < length) {
      newDigits.push('');
    }
    setDigits(newDigits);
  }, [value, length]);

  const focusInput = (index: number) => {
    if (inputRefs.current[index]) {
      inputRefs.current[index]?.focus();
    }
  };

  const handleChange = (index: number, newValue: string) => {
    if (disabled) return;

    // Оставить только цифры
    const digit = newValue.replace(/\D/g, '').slice(-1);
    
    const newDigits = [...digits];
    newDigits[index] = digit;
    setDigits(newDigits);

    const fullValue = newDigits.join('');
    onChange(fullValue);

    // Автопереход к следующему полю
    if (digit && index < length - 1) {
      focusInput(index + 1);
    }

    // Автопроверка при заполнении всех полей
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
    <div>
      <div className="flex justify-center gap-2">
        {digits.map((digit, index) => (
          <input
            key={index}
            ref={(el) => (inputRefs.current[index] = el)}
            type="text"
            inputMode="numeric"
            maxLength={1}
            value={digit}
            onChange={(e) => handleChange(index, e.target.value)}
            onKeyDown={(e) => handleKeyDown(index, e)}
            onPaste={handlePaste}
            disabled={disabled}
            className={cn(
              'h-12 w-12 rounded-lg border-2 text-center text-xl font-bold',
              'transition-all duration-200 focus:outline-none focus:ring-2',
              {
                'border-gray-300 bg-white text-gray-900 focus:border-accent focus:ring-accent dark:bg-dark-300 dark:text-light': !disabled && !digit && !error,
                'border-accent bg-accent/10 text-accent focus:border-accent focus:ring-accent': !disabled && digit && !error,
                'border-red-500 bg-red-50 text-red-600 focus:border-red-500 focus:ring-red-500': error,
                'border-gray-200 bg-gray-100 text-gray-400 cursor-not-allowed': disabled,
              }
            )}
          />
        ))}
      </div>
      {error && (
        <p className="mt-2 text-center text-sm text-red-600">{error}</p>
      )}
    </div>
  );
}

