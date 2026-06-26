import 'react-phone-input-2/lib/style.css';
import ReactPhone from 'react-phone-input-2';

interface ReactPhoneProps {
  country?: string;
  value: string;
  onChange: (value: string) => void;
  className?: string;
}

export default function PhoneInput({
  className,
  country = 'ru',
  value,
  onChange,
}: ReactPhoneProps) {
  return (
    <div className={className}>
      <ReactPhone
        country={country}
        value={value}
        onChange={onChange}
        inputClass="!w-full !h-12 !rounded-lg !border-gray-300 dark:!border-dark-400 dark:!bg-dark-300"
        buttonClass="!rounded-l-lg !border-gray-300 dark:!border-dark-400"
      />
    </div>
  );
}

export { ReactPhone };

