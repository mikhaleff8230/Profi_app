import cn from 'classnames';
import React from 'react';
import dynamic from 'next/dynamic';
import 'react-quill/dist/quill.snow.css';

// Динамический импорт для избежания SSR проблем
const ReactQuill = dynamic(() => import('react-quill'), { ssr: false });

export interface RichTextEditorProps {
  className?: string;
  label?: string;
  name: string;
  error?: string;
  variant?: 'normal' | 'solid' | 'outline';
  disabled?: boolean;
  value?: string;
  onChange?: (value: string) => void;
  placeholder?: string;
}

const classes = {
  normal:
    'bg-gray-100 border border-border-base focus:shadow focus:bg-light focus:border-accent',
  solid:
    'bg-gray-100 border border-border-100 focus:bg-light focus:border-accent',
  outline: 'border border-border-base focus:border-accent',
};

const RichTextEditor = React.forwardRef<HTMLDivElement, RichTextEditorProps>(
  (
    {
      className,
      label,
      name,
      error,
      variant = 'normal',
      disabled,
      value = '',
      onChange,
      placeholder,
    },
    ref
  ) => {
    // Простая конфигурация редактора
    const modules = {
      toolbar: [
        [{ header: [1, 2, 3, false] }],
        ['bold', 'italic', 'underline', 'strike'],
        [{ list: 'ordered' }, { list: 'bullet' }],
        ['link'],
        ['clean'],
      ],
    };

    const formats = [
      'header',
      'bold',
      'italic',
      'underline',
      'strike',
      'list',
      'bullet',
      'link',
    ];

    const handleChange = (content: string) => {
      if (onChange) {
        onChange(content);
      }
    };

    return (
      <div className={className} ref={ref}>
        {label && (
          <label
            htmlFor={name}
            className="mb-3 block text-sm font-semibold leading-none text-body-dark"
          >
            {label}
          </label>
        )}
        <div
          className={cn(
            'rounded transition duration-300 ease-in-out',
            {
              [classes.normal]: variant === 'normal',
              [classes.solid]: variant === 'solid',
              [classes.outline]: variant === 'outline',
            },
            {
              'opacity-60 cursor-not-allowed': disabled,
            }
          )}
        >
          <ReactQuill
            theme="snow"
            value={value}
            onChange={handleChange}
            modules={modules}
            formats={formats}
            placeholder={placeholder}
            readOnly={disabled}
            className={cn({
              'pointer-events-none': disabled,
            })}
          />
        </div>
        {error && (
          <p className="my-2 text-xs text-red-500 text-start">{error}</p>
        )}
      </div>
    );
  }
);

RichTextEditor.displayName = 'RichTextEditor';

export default RichTextEditor;

