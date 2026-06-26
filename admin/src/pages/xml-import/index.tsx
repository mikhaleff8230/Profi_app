import React, { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'next-i18next';
import { useRouter } from 'next/router';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import { toast } from 'react-toastify';
import { HttpClient, getFormErrors, getFieldErrors } from '@/data/client/http-client';
import { useMeQuery } from '@/data/user';
import { Routes } from '@/config/routes';
import Cookies from 'js-cookie';

interface FieldMapping {
  [key: string]: string;
}

interface ImportStats {
  total: number;
  imported: number;
  updated: number;
  errors: number;
  errors_list: string[];
}

interface AttributeMappingRow {
  id: string;
  attributeName: string;
  paramName: string;
}

interface AvailableFields {
  product_fields: { [key: string]: string };
  xml_formats: { [key: string]: string };
  default_mappings?: { [format: string]: { [field: string]: string } };
}

export default function XmlImportPage() {
  const router = useRouter();
  
  // Проверяем авторизацию сразу через cookies
  const AUTH_TOKEN_KEY = process.env.NEXT_PUBLIC_AUTH_TOKEN_KEY ?? 'authToken';
  const authToken = Cookies.get(AUTH_TOKEN_KEY);
  
  // Если токена нет - сразу редирект БЕЗ toast (чтобы не спамить)
  useEffect(() => {
    if (!authToken) {
      router.replace(Routes.login);
    }
  }, [authToken, router]);
  
  // Если токена нет - не загружаем компонент вообще
  if (!authToken) {
    return null;
  }
  
  return <XmlImportPageContent />;
}

// Основной компонент страницы (рендерится только если есть токен)
function XmlImportPageContent() {
  const { t } = useTranslation();
  const router = useRouter();
  const { locale } = router;
  const { data: me, isLoading: meLoading } = useMeQuery();
  const AUTH_TOKEN_KEY = process.env.NEXT_PUBLIC_AUTH_TOKEN_KEY ?? 'authToken';
  
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [importStats, setImportStats] = useState<ImportStats | null>(null);
  const [isPolling, setIsPolling] = useState(false);
  const [pollTimer, setPollTimer] = useState<any>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [fieldMapping, setFieldMapping] = useState<FieldMapping>({});
  const [xmlPreview, setXmlPreview] = useState<any>(null);
  const [errorMessages, setErrorMessages] = useState<string[]>([]);
  const [availableFields, setAvailableFields] = useState<AvailableFields | null>(null);
  const [savedMappings, setSavedMappings] = useState<any[]>([]);
  const [selectedMappingId, setSelectedMappingId] = useState<string>('');
  const [selectedXmlFormat, setSelectedXmlFormat] = useState<string>('yandex_market');
  const [shopId, setShopId] = useState<string>('');
  // Тип товара больше не требуется
  const [myShops, setMyShops] = useState<any[]>([]);
  const [categoryId, setCategoryId] = useState<string>('');
  const [categories, setCategories] = useState<any[]>([]);
  const [dryRun, setDryRun] = useState<boolean>(false);
  const [mappingFilter, setMappingFilter] = useState<string>('');
  const [importUrl, setImportUrl] = useState<string>('');
  // Убрали runInBackground - импорт ВСЕГДА идет в фоне (в очереди)
  const [jobToken, setJobToken] = useState<string>('');
  const [logs, setLogs] = useState<any[]>([]);
  const [stableErrors, setStableErrors] = useState<string[]>([]);
  const [logLevelFilter, setLogLevelFilter] = useState<string>('all');
  const [logCodeFilter, setLogCodeFilter] = useState<string>('');
  const [logSearch, setLogSearch] = useState<string>('');
  const [chunkSize, setChunkSize] = useState<number>(25); // Размер чанка (уменьшено для экономии памяти)
  const [importProgress, setImportProgress] = useState<any>(null); // Прогресс chunked импорта
  const [useChunked, setUseChunked] = useState<boolean>(false); // Chunked отключен - только простой импорт
  const [attributeMappings, setAttributeMappings] = useState<AttributeMappingRow[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Обновляем маппинг при смене формата XML
  const updateXmlFormat = (format: string) => {
    setSelectedXmlFormat(format);
    if (availableFields?.default_mappings?.[format]) {
      const newMapping: FieldMapping = {};
      Object.keys(availableFields.product_fields).forEach(field => {
        newMapping[field] = availableFields.default_mappings[format][field] || '';
      });
      setFieldMapping(newMapping);
    }
  };

  // Дополнительная проверка через useMeQuery (на случай невалидного токена)
  useEffect(() => {
    if (!meLoading && !me) {
      // Токен есть, но невалидный - очищаем и редирект
      Cookies.remove(AUTH_TOKEN_KEY);
      router.replace(Routes.login);
    }
  }, [me, meLoading, router, AUTH_TOKEN_KEY]);

  // Загружаем доступные поля и сохраненные маппинги при монтировании
  useEffect(() => {
    if (me) {
      loadAvailableFields();
      loadSavedMappings();
      loadMyShops();
    }
  }, [me]);

  // Инициализация категорий
  useEffect(() => {
    if (me) {
      loadCategories();
    }
  }, [me]);

  const loadAvailableFields = async () => {
    try {
      const data = await HttpClient.get<any>('/xml-import/fields');
      if (data?.success) {
        setAvailableFields(data.data);
        
        // Устанавливаем стандартный маппинг для Yandex.Market
        if (data.data?.product_fields && data.data?.default_mappings) {
          const defaultMapping: FieldMapping = {};
          Object.keys(data.data.product_fields).forEach(field => {
            // Устанавливаем стандартное значение для Yandex.Market
            defaultMapping[field] = data.data.default_mappings.yandex_market[field] || '';
          });
          setFieldMapping(defaultMapping);
        }
      } else {
        console.error('Failed to load available fields');
        toast.error('Не удалось загрузить доступные поля');
      }
    } catch (error: any) {
      console.error('Error loading available fields:', error);
      
      // Устанавливаем fallback значения для полей
      const fallbackFields: AvailableFields = {
        product_fields: {
          'name': 'Название товара',
          'description': 'Описание',
          'price': 'Цена',
          'sale_price': 'Цена со скидкой',
          'sku': 'Артикул (SKU)',
          'quantity': 'Количество',
          'category': 'Категория',
          'image': 'Изображение',
          'gallery': 'Галерея изображений',
          'vendor': 'Производитель',
          'model': 'Модель',
          'weight': 'Вес',
          'dimensions': 'Размеры',
          'url': 'Внешняя ссылка',
          'status': 'Статус товара',
          'type': 'Тип товара'
        },
        xml_formats: {
          'yandex_market': 'Yandex.Market',
          '1c': '1C:Предприятие',
          'universal': 'Универсальный формат',
          'csv': 'CSV'
        },
        default_mappings: {
          'yandex_market': {
            'name': 'name',
            'description': 'description',
            'price': 'price',
            'sku': 'id',
            'category': 'categoryId',
            'image': 'picture',
            'vendor': 'vendor',
            'model': 'model'
          },
          'csv': {
            'name': 'name',
            'description': 'description',
            'price': 'price',
            'sku': 'sku'
          },
          'universal': {
            'name': 'name',
            'description': 'description',
            'price': 'price',
            'sku': 'sku'
          },
          '1c': {
            'name': 'Наименование',
            'description': 'Описание',
            'price': 'Цена',
            'sku': 'Ид'
          }
        }
      };
      setAvailableFields(fallbackFields);
      
      // Не показываем toast если это ошибка авторизации (будет редирект)
      if (error?.response?.status !== 401 && error?.response?.status !== 403) {
        toast.warning('Используются локальные настройки полей');
      }
    }
  };

  const loadSavedMappings = async () => {
    try {
      const data = await HttpClient.get<any>('/xml-import/mappings');
      if (data?.success) setSavedMappings(data.data || []);
    } catch (error: any) {
      console.error('Error loading saved mappings:', error);
      // Тихо игнорируем ошибки загрузки маппингов - это не критично
      setSavedMappings([]);
    }
  };

  const loadMyShops = async () => {
    try {
      console.log('Loading shops...');
      const data = await HttpClient.get<any>('/my-shops');
      console.log('Shops API response:', data);
      const shops = data?.data || data || [];
      console.log('Shops array:', shops);
      setMyShops(shops);
      // НЕ выбираем магазин автоматически - пользователь ДОЛЖЕН выбрать вручную
      if (shops.length === 0) {
        console.warn('No shops found!');
        toast.warning('У вас нет магазинов для импорта');
      } else {
        console.log('Shops loaded:', shops.length);
        toast.info('Выберите магазин для импорта');
      }
    } catch (error: any) {
      console.error('Error loading shops:', error);
      // Устанавливаем пустой массив в случае ошибки
      setMyShops([]);
      if (error?.response?.status !== 401 && error?.response?.status !== 403) {
        toast.error('Не удалось загрузить список магазинов');
      }
    }
  };

  // типы не загружаем

  const loadCategories = async (typeSlug?: string) => {
    try {
      const slug = typeSlug || '';
      const params: any = {
        searchJoin: 'and',
        limit: 10000,
        search: HttpClient.formatSearchParams({ type: slug }),
        language: locale,
      };
      let data = await HttpClient.get<any>('/categories', params);
      let list = data?.data || data || [];
      // Фолбэк: если фильтрация по slug вернула пусто, пробуем без фильтра
      if (!list.length) {
        data = await HttpClient.get<any>('/categories', { limit: 10000, language: locale });
        list = data?.data || data || [];
      }
      setCategories(list);
      if (list.length > 0) {
        setCategoryId(String(list[0]?.id ?? ''));
      } else {
        setCategoryId('');
      }
    } catch (error: any) {
      console.error('Error loading categories:', error);
      // Устанавливаем пустой массив в случае ошибки
      setCategories([]);
      setCategoryId('');
      if (error?.response?.status !== 401 && error?.response?.status !== 403) {
        toast.error('Не удалось загрузить список категорий');
      }
    }
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Проверяем поддерживаемые форматы
      const supportedFormats = /\.(xml|yml|yaml|csv|txt)$/i;
      if (supportedFormats.test(file.name)) {
        setSelectedFile(file);
        setErrorMessages([]); // Очищаем предыдущие ошибки
        
        // Автоматически определяем формат
        const ext = file.name.split('.').pop()?.toLowerCase();
        if (['csv', 'txt'].includes(ext || '')) {
          setSelectedXmlFormat('csv');
        } else if (['xml'].includes(ext || '')) {
          setSelectedXmlFormat('yandex_market');
        } else if (['yml', 'yaml'].includes(ext || '')) {
          setSelectedXmlFormat('universal');
        }
        
        // Запускаем предпросмотр
        previewXmlFile(file);
      } else {
        toast.error('Поддерживаются только файлы: XML, YML, YAML, CSV, TXT');
        setErrorMessages(['Неподдерживаемый формат файла. Используйте XML, YML, YAML, CSV или TXT.']);
      }
    }
  };

  const previewXmlFile = async (file: File) => {
    try {
      const formData = new FormData();
      formData.append('xml_file', file);

      // Не устанавливаем Content-Type вручную: браузер добавит boundary сам
      const data = await HttpClient.post<any>('/xml-import/preview', formData);

      if (data?.success) {
        setXmlPreview(data.data);
        setErrorMessages([]);
        // автоопределение формата и применение дефолтного маппинга, если есть
        const detectedFormat = (data.data?.xml_type || data.data?.format) as string | undefined;
        if (detectedFormat && availableFields?.default_mappings?.[detectedFormat]) {
          setSelectedXmlFormat(detectedFormat);
          const newMapping: FieldMapping = {};
          Object.keys(availableFields.product_fields).forEach(field => {
            newMapping[field] = availableFields.default_mappings![detectedFormat][field] || '';
          });
          setFieldMapping((prev) => ({ ...newMapping, ...prev }));
        }
        toast.success('Предварительный просмотр загружен');
      } else {
        const msg = data?.message || 'Неизвестная ошибка';
        setErrorMessages([msg]);
        toast.error(`Ошибка при предварительном просмотре: ${msg}`);
      }
    } catch (error: any) {
      console.error('Error previewing XML:', error);
      const errorMsg = error?.response?.data?.message || error?.message || 'Ошибка при загрузке файла';
      setErrorMessages([errorMsg]);
      toast.error(errorMsg);
    }
  };

  const previewByUrl = async () => {
    if (!importUrl) {
      toast.error('Введите URL файла');
      return;
    }
    try {
      const data = await HttpClient.post<any>('/xml-import/preview', { xml_url: importUrl });
      if (data?.success) {
        setXmlPreview(data.data);
        setErrorMessages([]);
        const detectedFormat = (data.data?.xml_type || data.data?.format) as string | undefined;
        if (detectedFormat && availableFields?.default_mappings?.[detectedFormat]) {
          setSelectedXmlFormat(detectedFormat);
          const newMapping: FieldMapping = {};
          Object.keys(availableFields.product_fields).forEach(field => {
            newMapping[field] = availableFields.default_mappings![detectedFormat][field] || '';
          });
          setFieldMapping((prev) => ({ ...newMapping, ...prev }));
        }
        toast.success('Предпросмотр по URL загружен');
      } else {
        const msg = data?.message || 'Неизвестная ошибка';
        setErrorMessages([msg]);
        toast.error(`Ошибка при предварительном просмотре: ${msg}`);
      }
    } catch (error) {
      console.error('Error previewing by URL:', error);
      toast.error('Ошибка при загрузке по URL');
    }
  };

  const handleImport = async () => {
    if (!selectedFile && !importUrl) {
      toast.error('Пожалуйста, выберите файл или укажите URL для импорта');
      return;
    }

    if (selectedFile) {
      const supportedFormats = /\.(xml|yml|yaml|csv|txt)$/i;
      if (!supportedFormats.test(selectedFile.name)) {
        setErrorMessages(['Импорт поддерживается только для XML, YML, YAML, CSV, TXT']);
        toast.error('Импорт поддерживает XML, YML, YAML, CSV, TXT');
        return;
      }
    }

    if (Object.keys(fieldMapping).length === 0) {
      toast.error('Пожалуйста, настройте маппинг полей');
      return;
    }

    // Клиентские проверки маппинга
    const requiredFields = ['name', 'sku'];
    const missing = requiredFields.filter((f) => !fieldMapping[f]);
    if (missing.length) {
      const msg = `Заполните обязательные поля: ${missing.join(', ')}`;
      setErrorMessages([msg]);
      toast.error(msg);
      return;
    }

    // Дополнительные предупреждения
    if (!categoryId && !fieldMapping['category']) {
      toast.warn('Категория не указана: товар(ы) могут быть в статусе draft');
    }

    setIsImporting(true);

    try {
      const formData = new FormData();
      
      // Добавляем файл или URL
      if (selectedFile) {
        formData.append('xml_file', selectedFile);
      } else if (importUrl) {
        formData.append('xml_url', importUrl);
      }

      // Добавляем маппинг полей как обычную строку
      formData.append('field_mapping', JSON.stringify(fieldMapping));

      // Маппинг характеристик (атрибутов) из <param name="...">
      if (attributeMappings.length > 0) {
        formData.append('attribute_mapping', JSON.stringify(attributeMappings));
      }

      // КРИТИЧЕСКИ ВАЖНО: shop_id должен быть выбран
      if (!shopId || shopId === '' || shopId === 'undefined' || shopId === null) {
        toast.error('Выберите магазин для импорта!');
        console.error('shopId validation failed:', {
          shopId,
          type: typeof shopId,
          isEmpty: !shopId,
          isString: typeof shopId === 'string',
          length: shopId ? shopId.toString().length : 0
        });
        setIsImporting(false);
        return;
      }
      
      console.log('Selected shopId:', shopId, 'Type:', typeof shopId);
      console.log('Available shops:', myShops);
      console.log('shopId validation:', {
        shopId,
        isEmpty: !shopId,
        isString: typeof shopId === 'string',
        isNumber: typeof shopId === 'number',
        length: shopId ? shopId.toString().length : 0
      });
      
      // Подготавливаем опции с правильным shop_id
      const options = {
        update_existing: true,
        create_categories: true,
        shop_id: parseInt(shopId, 10), // ПРИНУДИТЕЛЬНО число
        category_id: categoryId ? parseInt(categoryId, 10) : undefined,
        dry_run: dryRun,
        download_images: true, // Загружаем изображения (для файлов до 100 товаров)
      };
      
      console.log('Import options:', options); // Отладка
      console.log('shop_id validation:', {
        original: shopId,
        converted: options.shop_id,
        type: typeof options.shop_id,
        isNaN: isNaN(options.shop_id),
        isValid: !isNaN(options.shop_id) && options.shop_id > 0
      });
      
      // Финальная проверка shop_id
      if (isNaN(options.shop_id) || options.shop_id <= 0) {
        toast.error('Неверный ID магазина!');
        console.error('Invalid shop_id:', options.shop_id);
        setIsImporting(false);
        return;
      }
      
      // Добавляем опции как обычную строку (НЕ Blob!)
      formData.append('options', JSON.stringify(options));

      // Импорт в фоне только для chunked, обычный - синхронно
      if (useChunked) {
        formData.append('queue', 'true');
        formData.append('chunked', 'true');
        formData.append('chunk_size', String(chunkSize));
      }

      // Не устанавливаем Content-Type вручную: браузер добавит boundary сам
      const data = await HttpClient.post<any>('/xml-import/import', formData);

      if (data?.success) {
        if (data?.data?.token) {
          setJobToken(data.data.token);
          if (data.data.import_type === 'chunked') {
            toast.success(`Chunked импорт запущен! Товаров: ${data.data.total_products}, Чанков: ${data.data.total_chunks}`);
            // Начинаем поллинг прогресса chunked импорта
            startPollingChunkedProgress(data.data.token);
          } else {
            toast.success('Импорт поставлен в очередь!');
            startPollingStatsWithToken(data.data.token);
          }
          return;
        }
        setImportStats(data.data);
        const errs = (data.data?.errors_list as string[]) || [];
        if (Array.isArray(errs) && errs.length > 0) setStableErrors(errs);
        setErrorMessages(errs);
        if (Array.isArray(data?.logs)) setLogs(data.logs);
        toast.success('Импорт успешно завершен!');
      } else {
        const msg = data?.message || 'Неизвестная ошибка';
        setErrorMessages([msg]);
        toast.error(`Ошибка при импорте: ${msg}`);
      }
    } catch (error) {
      console.error('Error during import:', error);
      const fieldErrs = getFieldErrors(error as any);
      const formErr = getFormErrors(error as any);
      const messages: string[] = [];
      if (formErr) messages.push(String(formErr));
      if (fieldErrs) {
        Object.entries(fieldErrs as Record<string, any>).forEach(([k, v]) => {
          if (Array.isArray(v)) {
            v.forEach((m) => messages.push(`${k}: ${m}`));
          } else if (v) {
            messages.push(`${k}: ${v}`);
          }
        });
      }
      if (!messages.length) messages.push('Ошибка при импорте');
      setErrorMessages(messages);
      toast.error(messages[0]);
    } finally {
      setIsImporting(false);
    }
  };

  const startPollingStats = () => {
    if (isPolling) return;
    setIsPolling(true);
    const t = setInterval(async () => {
      try {
        const data = await HttpClient.get<any>('/xml-import/stats');
        if (data?.success) {
          if (data.data) {
            setImportStats((prev) => {
              const next: any = { ...(data.data || {}) };
              // сохраняем уже показанные ошибки, если бэкенд вернул пусто
              if (!Array.isArray(next.errors_list) && Array.isArray((prev as any)?.errors_list)) {
                next.errors_list = (prev as any).errors_list;
              }
              return next as ImportStats;
            });
          }
          if (Array.isArray(data?.data?.errors_list)) {
            const list = data.data.errors_list as string[];
            if (list.length > 0) setStableErrors(list);
            setErrorMessages(list);
          }
          if (Array.isArray(data?.logs)) setLogs(data.logs);
          // если все обработано, прекращаем поллинг
          const stats = (data.data || {}) as ImportStats;
          const processed = (stats.imported || 0) + (stats.updated || 0) + (stats.errors || 0);
          if (stats.total && processed >= stats.total) {
            stopPollingStats();
          }
        }
      } catch (e) {
        // игнорируем единичные ошибки
      }
    }, 1500);
    setPollTimer(t);
  };

  const startPollingStatsWithToken = (token: string) => {
    if (isPolling) return;
    setIsPolling(true);
    const t = setInterval(async () => {
      try {
        const data = await HttpClient.get<any>('/xml-import/stats', { token });
        if (data?.success) {
          if (data.data) {
            setImportStats((prev) => {
              const next: any = { ...(data.data || {}) };
              if (!Array.isArray(next.errors_list) && Array.isArray((prev as any)?.errors_list)) {
                next.errors_list = (prev as any).errors_list;
              }
              return next as ImportStats;
            });
            if (Array.isArray(data?.data?.errors_list)) {
              const list = data.data.errors_list as string[];
              if (list.length > 0) setStableErrors(list);
              setErrorMessages(list);
            }
            if (Array.isArray(data?.logs)) setLogs(data.logs);
            const stats = data.data as ImportStats;
            const processed = (stats.imported || 0) + (stats.updated || 0) + (stats.errors || 0);
            if (stats.total && processed >= stats.total) {
              stopPollingStats();
              setJobToken('');
            }
          }
        }
      } catch (e) {
      }
    }, 1500);
    setPollTimer(t);
  };

  const startPollingChunkedProgress = (token: string) => {
    if (isPolling) return;
    setIsPolling(true);
    const t = setInterval(async () => {
      try {
        const progressData = await HttpClient.get<any>('/xml-import/progress', { token });
        const statsData = await HttpClient.get<any>('/xml-import/import-stats', { token });
        
        if (progressData?.success) {
          setImportProgress(progressData.progress);
        }
        
        if (statsData?.success) {
          const stats = statsData.stats;
          setImportStats(stats);
          
          if (Array.isArray(stats?.errors_list)) {
            setStableErrors(stats.errors_list);
            setErrorMessages(stats.errors_list);
          }
          
          // Проверяем, завершен ли импорт
          if (stats?.status === 'completed' || stats?.status === 'failed') {
            stopPollingStats();
            setJobToken('');
            if (stats.status === 'completed') {
              const totalProcessed = (stats.imported || 0) + (stats.updated || 0) + (stats.errors || 0);
              if (totalProcessed > 0) {
                toast.success(`Chunked импорт завершен! Обработано: ${totalProcessed} товаров`);
              } else {
                toast.warning('Chunked импорт завершен, но товары не были обработаны');
              }
            } else {
              toast.error('Chunked импорт завершен с ошибками');
            }
          }
        }
      } catch (e) {
        console.error('Error polling chunked progress:', e);
      }
    }, 2000); // Проверяем каждые 2 секунды
    setPollTimer(t);
  };

  const stopPollingStats = () => {
    if (pollTimer) clearInterval(pollTimer);
    setPollTimer(null);
    setIsPolling(false);
  };

  const saveFieldMapping = async () => {
    const mappingName = prompt('Введите название для сохранения маппинга:');
    if (!mappingName) return;

    try {
      const data = await HttpClient.post<any>('/xml-import/mappings', {
        field_mapping: fieldMapping,
        mapping_name: mappingName,
        attribute_mapping: attributeMappings,
      });
      if (data?.success) {
        toast.success('Маппинг сохранен');
        loadSavedMappings();
      } else {
        toast.error('Ошибка при сохранении маппинга');
      }
    } catch (error) {
      console.error('Error saving mapping:', error);
      toast.error('Ошибка при сохранении маппинга');
    }
  };

  const loadFieldMapping = (mapping: any) => {
    setFieldMapping(mapping.field_mapping);
    if (Array.isArray(mapping.attribute_mapping)) {
      setAttributeMappings(mapping.attribute_mapping);
    } else {
      setAttributeMappings([]);
    }
    toast.success('Маппинг загружен');
  };

  const applySelectedMapping = () => {
    const m = savedMappings.find((x) => String(x.id) === String(selectedMappingId));
    if (m) loadFieldMapping(m);
  };

  const deleteFieldMapping = async (id: string) => {
    if (!confirm('Вы уверены, что хотите удалить этот маппинг?')) return;

    try {
      const data = await HttpClient.delete<any>(`/xml-import/mappings/${id}`);
      if (data?.success) {
        toast.success('Маппинг удален');
        loadSavedMappings();
      } else {
        toast.error('Ошибка при удалении маппинга');
      }
    } catch (error) {
      console.error('Error deleting mapping:', error);
      toast.error('Ошибка при удалении маппинга');
    }
  };

  const updateFieldMapping = (field: string, value: string) => {
    setFieldMapping(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const getXmlFieldSuggestions = (field: string) => {
    const suggestions: { [key: string]: string[] } = {
      'name': ['name', 'title', 'product_name'],
      'description': ['description', 'desc', 'details'],
      'price': ['price', 'cost', 'amount'],
      'sku': ['id', 'sku', 'article', 'code'],
      'category': ['categoryId', 'category', 'group'],
      'image': ['picture', 'image', 'photo', 'image_url'],
      'gallery': ['gallery', 'images'],
      'tags': ['tags'],
      'weight': ['weight', 'mass'],
      'dimensions': ['dimensions', 'size', 'measurements'],
      'url': ['url', 'link', 'href'],
      'vendor': ['vendor', 'brand', 'manufacturer'],
      'status': ['status', 'state', 'published', 'draft'],
      // YML часто хранит массив param, но ключевые теги совпадают
    };

    return suggestions[field] || [];
  };

  const fillMissingMappingFromPreview = () => {
    try {
      const sample = xmlPreview?.preview?.[0] || xmlPreview?.preview || {};
      const keys = Array.isArray(sample) ? [] : Object.keys(sample || {});
      if (!keys.length) {
        toast.info('Нет данных превью для автозаполнения');
        return;
      }
      const guessPairs: { [k: string]: string[] } = {
        name: ['name', 'title'],
        description: ['description', 'desc'],
        price: ['price', 'cost', 'amount'],
        sku: ['sku', 'id', 'article', 'code'],
        category: ['category', 'categoryId', 'group'],
        image: ['image', 'picture', 'photo', 'image_url'],
        gallery: ['gallery', 'images'],
        tags: ['tags'],
        vendor: ['vendor', 'brand', 'manufacturer'],
        url: ['url', 'link', 'href'],
        status: ['status', 'state', 'published', 'draft'],
        // Тип товара не подставляем из category: либо явные поля, либо 'element'
        type: ['type', 'product_type'],
      };
      const updated: FieldMapping = { ...fieldMapping };
      Object.keys(availableFields?.product_fields || {}).forEach((dbField) => {
        if (updated[dbField]) return;
        const candidates = guessPairs[dbField] || [dbField];
        const match = candidates.find((c) => keys.includes(c));
        if (match) updated[dbField] = match;
      });
      // Специально: если поле type так и не найдено в превью — подставим осознанный дефолт
      if (!updated['type']) {
        updated['type'] = 'element';
      }
      setFieldMapping(updated);
      toast.success('Заполнили пропуски по превью');
    } catch (e) {
      // no-op
    }
  };

  const resetMappingToPreset = () => {
    if (!availableFields?.default_mappings?.[selectedXmlFormat]) {
      toast.info('Пресет для выбранного формата недоступен');
      return;
    }
    const newMapping: FieldMapping = {};
    Object.keys(availableFields.product_fields).forEach((field) => {
      newMapping[field] = availableFields.default_mappings![selectedXmlFormat][field] || '';
    });
    setFieldMapping(newMapping);
    toast.success('Маппинг сброшен к пресету формата');
  };

  const downloadErrorsCsv = () => {
    const rows: string[] = [];
    const header = ['index', 'error'];
    rows.push(header.join(','));
    const list: string[] = [];
    if (Array.isArray(importStats?.errors_list)) list.push(...(importStats?.errors_list as string[]));
    if (Array.isArray(errorMessages)) list.push(...errorMessages);
    const unique = Array.from(new Set(list));
    unique.forEach((msg, idx) => {
      // Экранируем кавычки и запятые
      const safe = '"' + String(msg).replace(/"/g, '""') + '"';
      rows.push([String(idx + 1), safe].join(','));
    });
    const csvContent = rows.join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'import_errors.csv';
    link.click();
    URL.revokeObjectURL(url);
  };

  const downloadLogsCsv = (onlyErrors: boolean = false) => {
    const rows: string[] = [];
    const header = ['ts','level','code','message','sku','row','index','context'];
    rows.push(header.join(','));
    const list = Array.isArray(logs) ? logs : [];
    list
      .filter((l: any) => !onlyErrors || String(l?.level) === 'error')
      .forEach((l: any) => {
        const ts = l?.ts ?? '';
        const level = l?.level ?? '';
        const code = l?.code ?? '';
        const message = l?.message ?? '';
        const ctx = l?.context || {};
        const sku = ctx?.sku ?? '';
        const row = ctx?.row ?? '';
        const index = ctx?.index ?? '';
        const contextJson = JSON.stringify(ctx ?? {});
        const toCsv = (v: any) => '"' + String(v).replace(/"/g, '""') + '"';
        rows.push([ts, level, code, message, sku, row, index, contextJson].map(toCsv).join(','));
      });
    const csvContent = rows.join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = onlyErrors ? 'import_logs_errors.csv' : 'import_logs_all.csv';
    link.click();
    URL.revokeObjectURL(url);
  };

  // Если пользователь не загружен - не показываем страницу
  if (!me) {
    return null;
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          🔒 Импорт XML товаров (Только для Супер-Админа)
        </h1>
        <p className="text-gray-600">
          Загрузите XML файл и настройте маппинг полей для импорта товаров
        </p>
      </div>

      {/* Настройки импорта */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <h2 className="text-xl font-semibold mb-4">1. Настройки импорта</h2>

        {/* Выбор магазина */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Магазин <span className="text-red-500">*</span>
          </label>
          <select
            value={shopId}
            onChange={(e) => setShopId(e.target.value)}
            className="border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            required
          >
            <option value="">-- Выберите магазин --</option>
            {myShops.map((s) => (
              <option key={s.id} value={s.id}>{s.name} (ID: {s.id})</option>
            ))}
          </select>
          {!shopId && (
            <p className="text-sm text-red-500 mt-1">⚠️ Выберите магазин для импорта</p>
          )}
        </div>

        {/* Выбор типа товара */}
        {/* Поле выбора типа убрано как не требуется */}

        {/* Выбор категории назначения */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">Категория назначения</label>
          <select
            value={categoryId}
            onChange={(e) => setCategoryId(e.target.value)}
            className="border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {categories.map((c) => (
              <option key={c.id} value={c.id}>{c.name} (ID: {c.id})</option>
            ))}
            {categories.length === 0 && (
              <option value="">— нет категорий для выбранного типа —</option>
            )}
          </select>
        </div>

        <h3 className="text-lg font-semibold mb-3">Файл</h3>
        
        <div className="flex items-center space-x-4">
          <input
            ref={fileInputRef}
            type="file"
            accept=".xml,.yml,.yaml,.csv,.txt,text/xml,text/csv,text/plain,application/xml,text/yaml,application/x-yaml"
            onChange={handleFileSelect}
            className="hidden"
          />
          
          <button
            onClick={() => fileInputRef.current?.click()}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            📁 Выбрать файл
          </button>
          
          {selectedFile && (
            <span className="text-green-600 font-medium">
              ✓ {selectedFile.name}
            </span>
          )}
        </div>

        {/* Импорт по URL */}
        <div className="mt-4 flex items-center space-x-2">
          <input
            type="text"
            value={importUrl}
            onChange={(e) => setImportUrl(e.target.value)}
            placeholder="https://example.com/feed.xml"
            className="flex-1 border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            onClick={previewByUrl}
            className="px-3 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            🔍 Предпросмотр по URL
          </button>
        </div>

        {/* Автоматическое определение формата */}
        <div className="mt-4">
          {selectedFile && (
            <div className="text-sm text-gray-600">
              <span className="font-medium">Определенный формат:</span> 
              <span className="ml-2 px-2 py-1 bg-blue-100 text-blue-800 rounded">
                {(() => {
                  const ext = selectedFile.name.split('.').pop()?.toLowerCase();
                  if (['csv', 'txt'].includes(ext || '')) return 'CSV';
                  if (['xml'].includes(ext || '')) return 'XML';
                  if (['yml', 'yaml'].includes(ext || '')) return 'YAML';
                  return 'Автоопределение';
                })()}
              </span>
            </div>
          )}
          <div className="mt-3 flex items-center space-x-2">
            <input
              id="dry-run"
              type="checkbox"
              checked={dryRun}
              onChange={(e) => setDryRun(e.target.checked)}
              className="h-4 w-4 text-blue-600 border-gray-300 rounded"
            />
            <label htmlFor="dry-run" className="text-sm text-gray-700">Тестовый запуск (Dry-run): без записи в базу</label>
          </div>
          
          {/* Информация о лимитах */}
          <div className="mt-3 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
            <p className="text-sm text-yellow-800">
              ⚠️ Рекомендуется импортировать <strong>до 100 товаров за раз</strong> для стабильной работы с изображениями.
            </p>
          </div>
        </div>
      </div>

      {/* Настройки маппинга */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold">2. Настройка маппинга полей</h2>
          <div className="flex space-x-2">
            <button
              onClick={() => setShowSettings(!showSettings)}
              className="px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded hover:bg-gray-200 transition-colors"
            >
              {showSettings ? 'Скрыть' : 'Показать'} настройки
            </button>
            <button
              onClick={fillMissingMappingFromPreview}
              className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
            >
              ✨ Заполнить пропуски
            </button>
            <button
              onClick={resetMappingToPreset}
              className="px-3 py-1 text-sm bg-gray-200 text-gray-800 rounded hover:bg-gray-300 transition-colors"
            >
              ♻️ Сбросить к пресету
            </button>
            <button
              onClick={saveFieldMapping}
              className="px-3 py-1 text-sm bg-green-600 text-white rounded hover:bg-green-700 transition-colors"
            >
              💾 Сохранить
            </button>
          </div>
        </div>

        {/* Показываем маппинг всегда, но с возможностью скрыть детали */}
        <div>
            <div className="mb-3 flex items-center space-x-2">
              <input
                type="text"
                value={mappingFilter}
                onChange={(e) => setMappingFilter(e.target.value)}
                placeholder="Поиск по полям..."
                className="w-full md:w-1/2 border rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <input
                type="file"
                accept="application/json"
                className="hidden"
                id="mapping-import-input"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (!f) return;
                  const reader = new FileReader();
                  reader.onload = () => {
                    try {
                      const obj = JSON.parse(String(reader.result || '{}'));
                      if (obj && typeof obj === 'object') {
                        setFieldMapping(obj as FieldMapping);
                        toast.success('Маппинг импортирован');
                      }
                    } catch {
                      toast.error('Некорректный JSON маппинга');
                    }
                  };
                  reader.readAsText(f);
                }}
              />
              <button
                onClick={() => document.getElementById('mapping-import-input')?.click()}
                className="px-3 py-2 text-sm bg-gray-100 text-gray-700 rounded hover:bg-gray-200"
              >
                ⬆️ Импорт JSON
              </button>
              <button
                onClick={() => {
                  const blob = new Blob([JSON.stringify(fieldMapping, null, 2)], { type: 'application/json' });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = 'mapping.json';
                  a.click();
                  URL.revokeObjectURL(url);
                }}
                className="px-3 py-2 text-sm bg-gray-100 text-gray-700 rounded hover:bg-gray-200"
              >
                ⬇️ Экспорт JSON
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {availableFields?.product_fields && Object.entries(availableFields.product_fields)
                .filter(([field]) => field.toLowerCase().includes(mappingFilter.toLowerCase()) || (availableFields.product_fields[field] || '').toLowerCase().includes(mappingFilter.toLowerCase()))
                .map(([field, label]) => (
              <div key={field} className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">
                  {label}{['name','sku'].includes(field) ? ' *' : ''}
                </label>
                {field === 'type' ? (
                  <input
                    type="text"
                    value={fieldMapping['type'] || ''}
                    onChange={(e) => updateFieldMapping('type', e.target.value)}
                    placeholder="Поле источника для типа"
                    className={`w-full border rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 ${'border-gray-300'}`}
                  />
                ) : (
                  <input
                    type="text"
                    value={fieldMapping[field] || ''}
                    onChange={(e) => updateFieldMapping(field, e.target.value)}
                    placeholder="XML поле"
                    className={`w-full border rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 ${['name','sku'].includes(field) && !fieldMapping[field] ? 'border-red-400' : 'border-gray-300'}`}
                  />
                )}
                <div className="text-xs text-gray-500">
                  {(() => {
                    const sugg = getXmlFieldSuggestions(field);
                    const keys = Array.isArray(xmlPreview?.preview) ? Object.keys(xmlPreview?.preview?.[0] || {}) : Object.keys(xmlPreview?.preview || {});
                    const highlighted = sugg.map((s) => keys.includes(s) ? `【${s}】` : s);
                    return <>Предложения: {highlighted.join(', ')}</>;
                  })()}
                </div>
              </div>
            ))}
            </div>

            {/* Маппинг характеристик (атрибутов) из XML <param name="..."> */}
            <div className="mt-8">
              <h3 className="text-lg font-semibold mb-3">Маппинг характеристик (атрибутов)</h3>
              <p className="text-sm text-gray-600 mb-3">
                Здесь можно связать характеристики из XML/YML вида
                {' '}<code>&lt;param name="Гарантийный срок"&gt;1 год&lt;/param&gt;</code>{' '}
                с атрибутами в системе. Слева — как атрибут будет называться у нас,
                справа — значение атрибута <code>name</code> в XML.
              </p>
              <div className="space-y-2">
                {attributeMappings.map((row, idx) => (
                  <div key={row.id} className="grid grid-cols-1 md:grid-cols-5 gap-2 items-center">
                    <div className="md:col-span-2">
                      <input
                        type="text"
                        value={row.attributeName}
                        onChange={(e) => {
                          const value = e.target.value;
                          setAttributeMappings((prev) =>
                            prev.map((r) => (r.id === row.id ? { ...r, attributeName: value } : r)),
                          );
                        }}
                        placeholder='Название атрибута в системе (например, "Гарантийный срок")'
                        className="w-full border rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div className="md:col-span-2">
                      <input
                        type="text"
                        value={row.paramName}
                        onChange={(e) => {
                          const value = e.target.value;
                          setAttributeMappings((prev) =>
                            prev.map((r) => (r.id === row.id ? { ...r, paramName: value } : r)),
                          );
                        }}
                        placeholder='XML param name (например, "Гарантийный срок")'
                        className="w-full border rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div className="flex justify-end">
                      <button
                        type="button"
                        onClick={() =>
                          setAttributeMappings((prev) => prev.filter((r) => r.id !== row.id))
                        }
                        className="px-2 py-1 text-xs bg-red-100 text-red-700 rounded hover:bg-red-200"
                      >
                        Удалить
                      </button>
                    </div>
                  </div>
                ))}
                <button
                  type="button"
                  onClick={() =>
                    setAttributeMappings((prev) => [
                      ...prev,
                      {
                        id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
                        attributeName: '',
                        paramName: '',
                      },
                    ])
                  }
                  className="mt-2 px-3 py-2 text-sm bg-blue-50 text-blue-700 rounded hover:bg-blue-100"
                >
                  ➕ Добавить характеристику
                </button>
              </div>
            </div>
          </div>

        {/* Сохраненные маппинги */}
        {savedMappings.length > 0 && (
          <div className="mt-6">
            <h3 className="text-lg font-medium mb-3">Сохраненные маппинги:</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {savedMappings.map((mapping) => (
                <div key={mapping.id} className="border border-gray-200 rounded-lg p-3">
                  <div className="flex justify-between items-center mb-2">
                    <span className="font-medium">{mapping.mapping_name}</span>
                    <div className="flex space-x-1">
                      <button
                        onClick={() => loadFieldMapping(mapping)}
                        className="text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded hover:bg-blue-200"
                      >
                        Загрузить
                      </button>
                      <button
                        onClick={() => deleteFieldMapping(mapping.id)}
                        className="text-xs px-2 py-1 bg-red-100 text-red-700 rounded hover:bg-red-200"
                      >
                        Удалить
                      </button>
                    </div>
                  </div>
                  <div className="text-xs text-gray-500">
                    Создан: {new Date(mapping.created_at).toLocaleDateString()}
                  </div>
                </div>
              ))}
            </div>

            {/* Быстрый выбор и применение сохраненного маппинга */}
            <div className="mt-4 flex items-center space-x-3">
              <select
                value={selectedMappingId}
                onChange={(e) => setSelectedMappingId(e.target.value)}
                className="border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">— выбрать —</option>
                {savedMappings.map((m) => (
                  <option key={m.id} value={m.id}>{m.mapping_name}</option>
                ))}
              </select>
              <button
                onClick={applySelectedMapping}
                className="px-3 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                Применить
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Предварительный просмотр */}
      {xmlPreview && (
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">3. Предварительный просмотр</h2>
          <div className="bg-gray-50 rounded-lg p-4 max-h-96 overflow-y-auto">
            <pre className="text-sm text-gray-700 whitespace-pre-wrap">
              {JSON.stringify(xmlPreview, null, 2)}
            </pre>
          </div>
        </div>
      )}

      {/* Импорт */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <h2 className="text-xl font-semibold mb-2">4. Импорт товаров</h2>
        {dryRun && (
          <div className="mb-3 p-3 rounded border border-yellow-300 bg-yellow-50 text-yellow-800 text-sm">
            Dry-run включен: импорт выполняется в режиме симуляции. Данные не записываются в базу.
          </div>
        )}
        
        <div className="flex items-center space-x-3">
          <button
            onClick={handleImport}
            disabled={(!selectedFile && !importUrl) || isImporting}
            className={`px-6 py-3 rounded-lg font-medium transition-colors ${
              (!selectedFile && !importUrl) || isImporting
                ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                : 'bg-green-600 text-white hover:bg-green-700'
            }`}
          >
            {isImporting ? '🔄 Импортирую...' : '🚀 Начать импорт'}
          </button>
          {isPolling && (
            <button
              onClick={stopPollingStats}
              className="px-3 py-2 rounded bg-gray-100 text-gray-700 hover:bg-gray-200"
            >
              Остановить обновление
            </button>
          )}
        </div>

        {/* Прогресс chunked импорта */}
        {importProgress && (
          <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
            <h3 className="font-medium mb-3 text-blue-900">Прогресс chunked импорта:</h3>
            <div className="mb-4">
              <div className="flex justify-between text-sm text-blue-700 mb-2">
                <span>Статус: {importProgress.status}</span>
                <span>{importProgress.progress_percent}%</span>
              </div>
              <div className="h-3 bg-blue-200 rounded">
                <div 
                  className="h-3 bg-blue-600 rounded transition-all duration-300" 
                  style={{ width: `${importProgress.progress_percent}%` }}
                />
              </div>
              <div className="mt-2 text-sm text-blue-600">
                Чанков: {importProgress.chunks_completed || 0} / {importProgress.total_chunks || 0}
                {importProgress.total_products && (
                  <span className="ml-4">Товаров: {importProgress.total_products}</span>
                )}
              </div>
            </div>
          </div>
        )}

        {importStats && (
          <div className="mt-6 p-4 bg-gray-50 rounded-lg">
            <h3 className="font-medium mb-3">Результаты импорта{importStats?.dry_run ? ' (симуляция)' : ''}:</h3>
            <div className="mb-3 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2 items-center">
              <div className="flex items-center space-x-2">
                <label className="text-sm text-gray-600">Уровень:</label>
                <select
                  value={logLevelFilter}
                  onChange={(e) => setLogLevelFilter(e.target.value)}
                  className="px-2 py-1 border rounded text-sm"
                >
                  <option value="all">Все</option>
                  <option value="error">Ошибки</option>
                  <option value="warning">Предупреждения</option>
                  <option value="info">Инфо</option>
                </select>
              </div>
              <div className="flex items-center space-x-2">
                <label className="text-sm text-gray-600">Код:</label>
                <input
                  type="text"
                  value={logCodeFilter}
                  onChange={(e) => setLogCodeFilter(e.target.value)}
                  placeholder="например, CSV_ROW_ERROR"
                  className="px-2 py-1 border rounded text-sm w-full"
                />
              </div>
              <div className="flex items-center space-x-2">
                <label className="text-sm text-gray-600">Поиск (SKU/сообщение):</label>
                <input
                  type="text"
                  value={logSearch}
                  onChange={(e) => setLogSearch(e.target.value)}
                  placeholder="SKU или текст"
                  className="px-2 py-1 border rounded text-sm w-full"
                />
              </div>
              <button
                onClick={downloadErrorsCsv}
                className="px-3 py-2 text-sm bg-red-100 text-red-700 rounded hover:bg-red-200"
              >
                ⬇️ Скачать ошибки CSV
              </button>
              {logs && logs.length > 0 && (
                <>
                  <button
                    onClick={() => downloadLogsCsv(true)}
                    className="px-3 py-2 text-sm bg-red-100 text-red-700 rounded hover:bg-red-200"
                  >
                    ⬇️ Журнал (только ошибки) CSV
                  </button>
                  <button
                    onClick={() => downloadLogsCsv(false)}
                    className="px-3 py-2 text-sm bg-gray-100 text-gray-800 rounded hover:bg-gray-200"
                  >
                    ⬇️ Журнал (все) CSV
                  </button>
                </>
              )}
              <button
                onClick={() => {
                  const blob = new Blob([JSON.stringify(logs ?? [], null, 2)], { type: 'application/json' });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = 'import_logs.json';
                  a.click();
                  URL.revokeObjectURL(url);
                }}
                className="px-3 py-2 text-sm bg-gray-100 text-gray-800 rounded hover:bg-gray-200"
              >
                ⬇️ Экспорт логов JSON
              </button>
            </div>
            {logs && logs.length > 0 && (
              <div className="mb-4">
                <h4 className="font-medium mb-2">Журнал:</h4>
                <div className="max-h-40 overflow-y-auto border border-gray-200 rounded">
                  {logs
                    .filter((l) => logLevelFilter === 'all' || String(l?.level) === logLevelFilter)
                    .filter((l) => !logCodeFilter || String(l?.code || '').toLowerCase().includes(logCodeFilter.toLowerCase()))
                    .filter((l) => {
                      if (!logSearch) return true;
                      const ctx = l?.context || {};
                      const hay = [l?.message, l?.code, l?.level, ctx?.sku, ctx?.row, ctx?.index].map(x => String(x ?? '')).join(' ').toLowerCase();
                      return hay.includes(logSearch.toLowerCase());
                    })
                    .map((l, i) => (
                    <div key={i} className="text-xs px-2 py-1 border-b border-gray-100">
                      <span className={`font-semibold ${l.level === 'error' ? 'text-red-600' : 'text-yellow-600'}`}>[{l.level}]</span>
                      <span className="ml-1">{l.code}</span>
                      <span className="ml-2 text-gray-600">{l.message}</span>
                      {l.context && (
                        <span className="ml-2 text-gray-400">{JSON.stringify(l.context)}</span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
            {/* Прогресс-бар */}
            {(() => {
              const total = importStats.total || 0;
              const processed = (importStats.imported || 0) + (importStats.updated || 0) + (importStats.errors || 0);
              const percent = total > 0 ? Math.min(100, Math.round((processed / total) * 100)) : 0;
              return (
                <div className="mb-4">
                  <div className="h-3 bg-gray-200 rounded">
                    <div className="h-3 bg-blue-600 rounded" style={{ width: `${percent}%` }} />
                  </div>
                  <div className="mt-1 text-xs text-gray-600">{processed} / {total} ({percent}%) {importStats?.dry_run ? '(симуляция)' : ''}</div>
                </div>
              );
            })()}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">{importStats.total}</div>
                <div className="text-sm text-gray-600">Всего</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">{importStats.imported}</div>
                <div className="text-sm text-gray-600">Импортировано</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-yellow-600">{importStats.updated}</div>
                <div className="text-sm text-gray-600">Обновлено</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-red-600">{Array.isArray(importStats.errors_list) ? importStats.errors_list.length : (importStats.errors || 0)}</div>
                <div className="text-sm text-gray-600">Ошибки</div>
              </div>
            </div>
            
            {(() => {
              const list = Array.isArray(importStats.errors_list) && importStats.errors_list.length > 0 ? importStats.errors_list : stableErrors;
              if (!Array.isArray(list) || list.length === 0) return null;
              return (
              <div className="mt-4">
                <h4 className="font-medium text-red-600 mb-2">Список ошибок:</h4>
                <div className="bg-red-50 border border-red-200 rounded-lg p-3 max-h-32 overflow-y-auto">
                  {list.map((error, index) => (
                    <div key={index} className="text-sm text-red-700 mb-1">
                      {error}
                    </div>
                  ))}
                </div>
              </div>
              );
            })()}
          </div>
        )}
      </div>

      {/* Панель ошибок */}
      <div className="bg-red-50 rounded-lg p-6">
        <h2 className="text-xl font-semibold text-red-900 mb-4">Ошибки импорта</h2>
        <div className="mb-2">
          <button
            onClick={downloadErrorsCsv}
            className="px-3 py-2 text-sm bg-red-100 text-red-700 rounded hover:bg-red-200"
          >
            ⬇️ Скачать ошибки CSV
          </button>
        </div>
        {errorMessages.length === 0 ? (
          <div className="text-sm text-red-700">Ошибок нет.</div>
        ) : (
          <ul className="list-disc pl-5 space-y-1 text-sm text-red-800">
            {errorMessages.map((msg, idx) => (
              <li key={idx}>{msg}</li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

export async function getStaticProps({ locale }: { locale: string }) {
  return {
    props: {
      ...(await serverSideTranslations(locale, ['common'])),
    },
  };
}
