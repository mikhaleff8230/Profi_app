import Uploader from '@/components/common/uploader';
import { Controller } from 'react-hook-form';

interface FileInputProps {
  control: any;
  name: string;
  multiple?: boolean;
  acceptFile?: boolean;
  acceptVideo?: boolean;
  helperText?: string;
  defaultValue?: any;
  maxSize?: number;
}

const FileInput = ({
  control,
  name,
  multiple = true,
  acceptFile = false,
  acceptVideo = false,
  helperText,
  defaultValue = [],
  maxSize,
}: FileInputProps) => {
  return (
    <Controller
      control={control}
      name={name}
      defaultValue={defaultValue}
      render={({ field: { ref, ...rest } }) => (
        <Uploader
          {...rest}
          multiple={multiple}
          acceptFile={acceptFile}
          acceptVideo={acceptVideo}
          helperText={helperText}
          maxSize={maxSize}
        />
      )}
    />
  );
};

export default FileInput;
