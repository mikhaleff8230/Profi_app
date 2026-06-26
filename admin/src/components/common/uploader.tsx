import { UploadIcon } from '@/components/icons/upload-icon';
import { VideoCameraIcon } from '@/components/icons/video-camera-icon';
import { useEffect, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { Attachment } from '@/types';
import { CloseIcon } from '@/components/icons/close-icon';
import Loader from '@/components/ui/loader/loader';
import { useTranslation } from 'next-i18next';
import { useUploadMutation } from '@/data/upload';
import Image from 'next/image';
import { zipPlaceholder } from '@/utils/placeholders';
import { ACCEPTED_FILE_TYPES, ACCEPTED_VIDEO_TYPES } from '@/utils/constants';
// import { processFileWithName } from '../product/form-utils';

const getPreviewImage = (value: any) => {
  let images: any[] = [];
  if (value) {
    images = Array.isArray(value) ? value : [{ ...value }];
  }
  return images;
};

const getFileMeta = (file: any, idx: number) => {
  const fallbackName = `file_${idx}`;

  if (file?.file_name && typeof file.file_name === 'string') {
    const parts = file.file_name.split('.');
    if (parts.length > 1) {
      const ext = parts.pop() || 'file';
      return {
        filename: parts.join('.') || fallbackName,
        fileType: ext.toLowerCase(),
      };
    }

    return {
      filename: file.file_name || fallbackName,
      fileType: 'file',
    };
  }

  const rawUrl = file?.original || file?.thumbnail || '';
  if (!rawUrl || typeof rawUrl !== 'string') {
    return {
      filename: fallbackName,
      fileType: 'file',
    };
  }

  try {
    const cleanPath = decodeURIComponent(rawUrl.split('?')[0]);
    const leaf = cleanPath.substring(cleanPath.lastIndexOf('/') + 1);
    const parts = leaf.split('.');
    if (parts.length > 1) {
      const ext = parts.pop() || 'file';
      return {
        filename: parts.join('.') || fallbackName,
        fileType: ext.toLowerCase(),
      };
    }

    return {
      filename: leaf || fallbackName,
      fileType: 'file',
    };
  } catch {
    return {
      filename: fallbackName,
      fileType: 'file',
    };
  }
};

export default function Uploader({
  onChange,
  value,
  multiple,
  acceptFile,
  acceptVideo,
  helperText,
  maxSize
}: any) {
  const { t } = useTranslation();
  const [files, setFiles] = useState<Attachment[]>(getPreviewImage(value));
  const { mutate: upload, isLoading: loading } = useUploadMutation();
  const [error, setError] = useState<string | null>(null);
  
  // Простая синхронизация с формой - обновляем только если не загружаем
  useEffect(() => {
    if (!loading) {
      const newFiles = getPreviewImage(value);
      setFiles(newFiles);
    }
  }, [value, loading]);
  
  // Определяем accept в зависимости от типа файлов
  let acceptConfig: any;
  if (acceptVideo) {
    acceptConfig = ACCEPTED_VIDEO_TYPES;
  } else if (acceptFile) {
    acceptConfig = ACCEPTED_FILE_TYPES;
  } else {
    acceptConfig = {
      'image/*': ['.jpg', '.jpeg', '.png', '.webp'],
    };
  }
  
  const { getRootProps, getInputProps } = useDropzone({
    accept: acceptConfig,
    multiple,
    maxSize: maxSize,
    onDrop: async (acceptedFiles, rejectedFiles) => {
      // Проверяем отклоненные файлы (например, из-за размера)
      if (rejectedFiles && rejectedFiles.length > 0) {
        const rejection = rejectedFiles[0];
        if (rejection.errors && rejection.errors.length > 0) {
          const error = rejection.errors[0];
          if (error.code === 'file-too-large') {
            const maxSizeMB = maxSize ? (maxSize / (1024 * 1024)).toFixed(0) : '40';
            setError(`Файл слишком большой. Максимальный размер: ${maxSizeMB} МБ`);
            return;
          }
          setError(error.message || 'Ошибка загрузки файла');
          return;
        }
      }
      
      if (acceptedFiles.length) {
        // Для видео файлов не загружаем через attachments API, передаем File напрямую
        if (acceptVideo) {
          const videoFile = acceptedFiles[0]; // Для видео только один файл
          
          // Дополнительная проверка размера для видео
          if (maxSize && videoFile.size > maxSize) {
            const maxSizeMB = (maxSize / (1024 * 1024)).toFixed(0);
            setError(`Видео слишком большое. Максимальный размер: ${maxSizeMB} МБ`);
            return;
          }
          
          if (onChange) {
            onChange(videoFile); // Передаем оригинальный File объект
          }
          // Для превью создаем временный объект с правильным thumbnail
          const previewUrl = URL.createObjectURL(videoFile);
          
          // Сначала устанавливаем fallback превью
          const tempId = `temp-${Date.now()}`;
          setFiles([{
            id: tempId,
            thumbnail: previewUrl, // Временно используем blob URL
            original: previewUrl,
            file_name: videoFile.name,
          }]);
          
          // Создаем video элемент для получения первого кадра
          const video = document.createElement('video');
          video.preload = 'metadata';
          video.muted = true;
          video.playsInline = true;
          video.src = previewUrl;
          
          const extractThumbnail = () => {
            try {
              // Создаем canvas для извлечения кадра
              const canvas = document.createElement('canvas');
              const ctx = canvas.getContext('2d');
              
              if (!ctx || !video.videoWidth || !video.videoHeight) {
                return; // Не удалось получить размеры
              }
              
              canvas.width = video.videoWidth;
              canvas.height = video.videoHeight;
              ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
              
              const thumbnailUrl = canvas.toDataURL('image/jpeg', 0.8);
              
              // Обновляем файл с правильным thumbnail
              setFiles([{
                id: tempId,
                thumbnail: thumbnailUrl,
                original: previewUrl,
                file_name: videoFile.name,
              }]);
            } catch (e) {
              console.warn('Failed to extract video thumbnail:', e);
            }
          };
          
          video.addEventListener('loadedmetadata', () => {
            video.currentTime = 0.1; // Устанавливаем время для получения кадра
          });
          
          video.addEventListener('seeked', extractThumbnail);
          
          video.addEventListener('error', () => {
            // Оставляем fallback превью
            console.warn('Failed to load video for thumbnail extraction');
          });
          
          // Загружаем видео
          video.load();
        } else {
          // Для остальных файлов используем стандартную загрузку через attachments API
          upload(
            acceptedFiles, // it will be an array of uploaded attachments
            {
              onSuccess: (data: any) => {
                // Process Digital File Name section
                data &&
                  data?.map((file: any, idx: any) => {
                    const splitArray = file?.original?.split('/');
                    let fileSplitName =
                      splitArray[splitArray?.length - 1]?.split('.');
                    const fileType = fileSplitName?.pop(); // it will pop the last item from the fileSplitName arr which is the file ext
                    const filename = fileSplitName?.join('.'); // it will join the array with dot, which restore the original filename
                    data[idx]['file_name'] = filename + '.' + fileType;
                  });

                let mergedData;
                if (multiple) {
                  // Объединяем существующие файлы из формы с новыми загруженными
                  const currentFiles = getPreviewImage(value);
                  mergedData = currentFiles.concat(data);
                  setFiles(mergedData);
                } else {
                  mergedData = data[0];
                  setFiles(data);
                }
                if (onChange) {
                  onChange(mergedData);
                }
              },
            }
          );
        }
      }
    },
    maxSize: maxSize,

    onDropRejected: (fileRejections) => {
      fileRejections.forEach((file) => {
        file?.errors?.forEach((error) => {
          if (error?.code === 'file-too-large') {
            setError(t('error-file-too-large'));
          } else if (error?.code === 'file-invalid-type') {
            setError(t('error-invalid-file-type'));
          }
        });
      });
    },
  });

  const handleDelete = (image: string) => {
    const images = files.filter((file) => 
      file.thumbnail !== image && file.original !== image && file.id !== image
    );
    setFiles(images);
    if (onChange) {
      // Для видео передаем null, для остальных - массив
      if (acceptVideo) {
        onChange(null);
      } else {
        onChange(images);
      }
    }
  };
  const thumbs = files?.map((file: any, idx) => {
    const imgTypes = [
      'tif',
      'tiff',
      'bmp',
      'jpg',
      'jpeg',
      'webp',
      'gif',
      'png',
      'eps',
      'raw',
    ];
    const videoTypes = [
      'mp4',
      'mpeg',
      'mov',
      'avi',
      'wmv',
      'webm',
      'ogv',
    ];
    // let filename, fileType, isImage;
    if (file && (file.id || file.thumbnail || file.original)) {
      // const processedFile = processFileWithName(file);
      const { filename, fileType } = getFileMeta(file, idx);
      const isImage = imgTypes.includes(fileType.toLowerCase());
      const isVideo = videoTypes.includes(fileType.toLowerCase());

      // Old Code *******

      // const splitArray = file?.original?.split('/');
      // let fileSplitName = splitArray[splitArray?.length - 1]?.split('.'); // it will create an array of words of filename
      // const fileType = fileSplitName.pop(); // it will pop the last item from the fileSplitName arr which is the file ext
      // const filename = fileSplitName.join('.'); // it will join the array with dot, which restore the original filename
      // const isImage = file?.thumbnail && imgTypes.includes(fileType); // check if the original filename has the img ext

      return (
        <div
          className={`relative mt-2 inline-flex flex-col overflow-hidden rounded me-2 ${
            isImage ? 'border border-border-200' : ''
          }`}
          key={idx}
        >
          {isImage ? (
            <figure className="relative h-16 w-28">
              <Image
                src={file.thumbnail}
                alt={filename}
                fill
                sizes="(max-width: 768px) 100vw"
                className="object-contain"
              />
            </figure>
          ) : isVideo ? (
            <div className="flex flex-col items-center justify-center h-16 w-28 bg-dark-300 rounded">
              {file.thumbnail ? (
                <figure className="relative h-full w-full">
                  <Image
                    src={file.thumbnail}
                    alt={filename}
                    fill
                    sizes="(max-width: 768px) 100vw"
                    className="object-cover rounded"
                  />
                  <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-30">
                    <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24">
                      <polygon points="5,3 19,12 5,21" />
                    </svg>
                  </div>
                </figure>
              ) : (
                <div className="flex flex-col items-center">
                  <svg className="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 24 24">
                    <polygon points="5,3 19,12 5,21" />
                  </svg>
                  <p className="mt-1 text-xs text-white">{fileType?.toUpperCase()}</p>
                </div>
              )}
            </div>
          ) : (
            <div className="flex flex-col items-center">
              <div className="flex items-center justify-center min-w-0 overflow-hidden h-14 w-14">
                <Image
                  src={zipPlaceholder}
                  width={56}
                  height={56}
                  alt="upload placeholder"
                />
              </div>
              <p className="flex items-baseline p-1 text-xs cursor-default text-body">
                <span
                  className="inline-block max-w-[64px] overflow-hidden overflow-ellipsis whitespace-nowrap"
                  title={`${filename}.${fileType}`}
                >
                  {filename}
                </span>
                {fileType !== 'file' ? `.${fileType}` : ''}
              </p>
            </div>
          )}
          {(multiple || acceptVideo) ? (
            <button
              className="absolute flex items-center justify-center w-4 h-4 text-xs bg-red-600 rounded-full shadow-xl outline-none top-1 text-light end-1"
              onClick={() => handleDelete(file.id || file.thumbnail || file.original)}
            >
              <CloseIcon width={10} height={10} />
            </button>
          ) : null}
        </div>
      );
    }
  });

  useEffect(
    () => () => {
      // Reset error after upload new file
      setError(null);

      // Make sure to revoke the data uris to avoid memory leaks
      files.forEach((file: any) => URL.revokeObjectURL(file.thumbnail));
    },
    [files]
  );

  return (
    <section className="upload">
      <div
        {...getRootProps({
          className:
            'border-dashed border-2 border-border-base h-32 rounded flex flex-col justify-center items-center cursor-pointer focus:border-accent-400 focus:outline-none hover:border-accent transition-colors',
        })}
      >
        <input {...getInputProps()} />
        {acceptVideo ? (
          <VideoCameraIcon className="text-muted-light w-8 h-8 mb-2" />
        ) : (
          <UploadIcon className="text-muted-light" />
        )}
        <p className="mt-2 text-sm text-center text-body">
          {helperText ? (
            <span className="font-semibold text-gray-500">{helperText}</span>
          ) : acceptVideo ? (
            <span className="text-body">Нажмите, чтобы загрузить видео</span>
          ) : acceptFile ? (
            <>
              <span className="font-semibold text-accent">
                Нажмите для загрузки файла
              </span>
              <br />
              <span className="text-xs text-body">ZIP, RAR, PDF, PNG, JPG</span>
            </>
          ) : (
            <>
              <span className="font-semibold text-accent">
                {t('text-upload-highlight')}
              </span>{' '}
              {t('text-upload-message')} <br />
              <span className="text-xs text-body">{t('text-img-format')}</span>
            </>
          )}
        </p>
        {error && (
          <p className="mt-4 text-sm text-center text-red-600 text-body">
            {error}
          </p>
        )}
      </div>

      {(!!thumbs.length || loading) && (
        <aside className="flex flex-wrap mt-2">
          {!!thumbs.length && thumbs}
          {loading && (
            <div className="flex items-center h-16 mt-2 ms-2">
              <Loader simple={true} className="w-6 h-6" />
            </div>
          )}
        </aside>
      )}
    </section>
  );
}
