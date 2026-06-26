import { Switch as HeadlessSwitch } from '@headlessui/react';

interface SwitchProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
  className?: string;
  label?: string;
}

const Switch = ({ checked, onChange, disabled, className = '', label }: SwitchProps) => {
  return (
    <div>
      {label && <label className="block text-sm font-medium text-body mb-2">{label}</label>}
      <HeadlessSwitch
        checked={checked}
        onChange={onChange}
        disabled={disabled}
        className={`${
          checked ? 'bg-accent' : 'bg-gray-300'
        } relative inline-flex h-6 w-11 items-center rounded-full focus:outline-none transition-colors ${
          disabled ? 'cursor-not-allowed bg-[#EEF1F4]' : 'cursor-pointer'
        } ${className}`}
      >
        <span className="sr-only">Enable {label}</span>
        <span
          className={`${
            checked ? 'translate-x-6' : 'translate-x-1'
          } inline-block h-4 w-4 transform rounded-full bg-white transition-transform`}
        />
      </HeadlessSwitch>
    </div>
  );
};

export default Switch;

