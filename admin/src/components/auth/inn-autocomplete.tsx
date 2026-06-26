import { useState, useEffect, useRef } from 'react';
import Input from '@/components/ui/input';
import { HttpClient } from '@/data/client/http-client';
import { toast } from 'react-toastify';

interface InnAutocompleteProps {
  value: string;
  onChange: (value: string) => void;
  onDataLoaded?: (data: any) => void;
  error?: string;
  ownershipForm?: string;
  disabled?: boolean;
}

export default function InnAutocomplete({
  value,
  onChange,
  onDataLoaded,
  error,
  ownershipForm,
  disabled = false,
}: InnAutocompleteProps) {
  const [isLoading, setIsLoading] = useState(false);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  // Определяем тип организации на основе формы собственности
  const getPartyType = (): string | null => {
    if (ownershipForm === 'ИП') {
      return 'INDIVIDUAL';
    } else if (ownershipForm === 'ООО' || ownershipForm === 'Самозанятый') {
      return 'LEGAL';
    }
    return null; // Если форма не выбрана, ищем оба типа
  };

  const searchParty = async (inn: string) => {
    if (!inn || inn.length < 10) {
      return;
    }

    // Валидация ИНН (10 или 12 цифр)
    if (!/^\d{10}$|^\d{12}$/.test(inn)) {
      return;
    }

    setIsLoading(true);

    try {
      const partyType = getPartyType();
      const params: any = { inn };
      if (partyType) {
        params.type = partyType;
      }

      console.log('InnAutocomplete: Searching party with params:', params);
      const result = await HttpClient.get('/api/party/find-by-inn', params);

      console.log('InnAutocomplete: DaData API response:', result);

      if (result && result.success && result.data) {
        const partyData = result.data;
        console.log('InnAutocomplete: Party data loaded:', partyData);
        
        // Вызываем callback с данными для автозаполнения
        if (onDataLoaded) {
          console.log('InnAutocomplete: Calling onDataLoaded callback');
          onDataLoaded(partyData);
        } else {
          console.warn('InnAutocomplete: onDataLoaded callback not provided');
        }
      } else {
        // Организация не найдена - это не ошибка, просто нет данных
        console.log('InnAutocomplete: Организация не найдена по ИНН:', inn, result);
        if (result && result.error) {
          console.log('InnAutocomplete: Error message:', result.error);
        }
      }
    } catch (error: any) {
      console.error('Ошибка поиска организации по ИНН:', error);
      // Не показываем ошибку пользователю, если это просто "не найдено"
      if (error?.response?.status !== 404) {
        toast.error('Ошибка при поиске организации по ИНН');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleChange = (newValue: string) => {
    onChange(newValue);

    // Очищаем предыдущий таймер
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    // Устанавливаем новый таймер для поиска через 1 секунду после окончания ввода
    debounceRef.current = setTimeout(() => {
      if (newValue && newValue.length >= 10) {
        searchParty(newValue);
      }
    }, 1000);
  };

  // Очистка таймера при размонтировании
  useEffect(() => {
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, []);

  return (
    <div className="relative">
      <Input
        label="ИНН"
        value={value}
        onChange={(e) => handleChange(e.target.value)}
        error={error}
        variant="outline"
        disabled={disabled || isLoading}
        placeholder="Введите ИНН (10 или 12 цифр)"
        className="mb-5"
      />
      {isLoading && (
        <div className="absolute right-3 top-9">
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-900"></div>
        </div>
      )}
      {value && value.length >= 10 && !isLoading && (
        <p className="mt-1 text-xs text-gray-500">
          Поиск организации по ИНН через DaData...
        </p>
      )}
    </div>
  );
}

