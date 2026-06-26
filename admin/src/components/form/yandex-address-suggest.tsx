import React, { useCallback, useEffect, useRef, useState } from 'react';
import type { RefCallBack } from 'react-hook-form';
import Label from '@/components/ui/label';
import Loader from '@/components/ui/loader/loader';
import TextArea from '@/components/ui/text-area';

declare global {
  interface Window {
    ymaps?: any;
  }
}

let ymapsLoadPromise: Promise<void> | null = null;

function loadYmaps(apiKey: string): Promise<void> {
  if (typeof window === 'undefined') {
    return Promise.reject(new Error('no window'));
  }
  if (window.ymaps) {
    return new Promise((resolve) => {
      window.ymaps.ready(() => resolve());
    });
  }
  if (ymapsLoadPromise) {
    return ymapsLoadPromise;
  }
  ymapsLoadPromise = new Promise((resolve, reject) => {
    const existing = document.querySelector('script[data-yandex-maps-api="2.1"]');
    if (existing) {
      const check = () => {
        if (window.ymaps) {
          window.ymaps.ready(() => resolve());
        } else {
          setTimeout(check, 50);
        }
      };
      check();
      return;
    }
    const script = document.createElement('script');
    script.src = `https://api-maps.yandex.ru/2.1/?apikey=${encodeURIComponent(
      apiKey
    )}&lang=ru_RU&coordorder=latlong`;
    script.async = true;
    script.dataset.yandexMapsApi = '2.1';
    script.onload = () => {
      if (window.ymaps) {
        window.ymaps.ready(() => resolve());
      } else {
        reject(new Error('ymaps not defined'));
      }
    };
    script.onerror = () => reject(new Error('Yandex Maps script failed'));
    document.head.appendChild(script);
  });
  return ymapsLoadPromise;
}

export type YandexAddressSuggestProps = {
  /** Текущий адрес (связан с формой) */
  value: string;
  onAddressChange: (text: string) => void;
  onCoordinates: (lat: number, lng: number) => void;
  apiKey?: string;
  name?: string;
  error?: string;
  onBlur?: () => void;
  textareaRef?: RefCallBack;
};

/**
 * Подсказки адреса через JS API Яндекс.Карт (suggest + geocode).
 * Тот же ключ, что и на витрине: NEXT_PUBLIC_YANDEX_MAPS_API_KEY.
 */
export default function YandexAddressSuggest({
  value,
  onAddressChange,
  onCoordinates,
  apiKey = process.env.NEXT_PUBLIC_YANDEX_MAPS_API_KEY,
  name = 'address',
  error,
  onBlur,
  textareaRef,
}: YandexAddressSuggestProps) {
  const [ready, setReady] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!apiKey) {
      setLoadError('no_key');
      return;
    }
    let cancelled = false;
    loadYmaps(apiKey)
      .then(() => {
        if (!cancelled) {
          setReady(true);
          setLoadError(null);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setLoadError('load');
        }
      });
    return () => {
      cancelled = true;
    };
  }, [apiKey]);

  const runSuggest = useCallback(
    (text: string) => {
      if (!ready || !window.ymaps || text.trim().length < 2) {
        setSuggestions([]);
        return;
      }
      setLoading(true);
      const suggestFn = window.ymaps.suggest;
      if (typeof suggestFn !== 'function') {
        setSuggestions([]);
        setLoading(false);
        return;
      }
      suggestFn
        .call(window.ymaps, text.trim(), { results: 8 })
        .then((items: any[]) => {
          setSuggestions(Array.isArray(items) ? items : []);
          setOpen(true);
        })
        .catch(() => setSuggestions([]))
        .finally(() => setLoading(false));
    },
    [ready]
  );

  useEffect(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }
    debounceRef.current = setTimeout(() => {
      runSuggest(value);
    }, 350);
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, [value, runSuggest]);

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, []);

  const pickItem = useCallback(
    (item: any) => {
      const query = item?.value || item?.displayName || String(item);
      if (!query || !window.ymaps) return;
      setOpen(false);
      setLoading(true);
      window.ymaps
        .geocode(query, { results: 1 })
        .then((res: any) => {
          const first = res?.geoObjects?.get?.(0);
          if (!first) return;
          const coords = first.geometry?.getCoordinates?.();
          if (!coords || coords.length < 2) return;
          // Подключение с coordorder=latlong → [широта, долгота]
          const lat = Number(coords[0]);
          const lng = Number(coords[1]);
          if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;
          const line =
            first.getAddressLine?.() ||
            first.properties?.get?.('text') ||
            query;
          onAddressChange(String(line));
          onCoordinates(lat, lng);
        })
        .finally(() => setLoading(false));
    },
    [onAddressChange, onCoordinates]
  );

  const geocodeCurrentText = useCallback(() => {
    const q = value?.trim();
    if (!q || !window.ymaps) return;
    pickItem({ value: q });
  }, [value, pickItem]);

  if (!apiKey || loadError === 'no_key') {
    return (
      <p className="text-xs text-amber-700">
        Задайте NEXT_PUBLIC_YANDEX_MAPS_API_KEY (тот же ключ, что для витрины) —
        появятся подсказки адреса и автоподстановка координат. Адрес можно
        ввести только текстом ниже.
      </p>
    );
  }

  if (loadError === 'load') {
    return (
      <p className="text-xs text-red-600">
        Не удалось загрузить API Яндекс.Карт. Проверьте ключ и блокировщики.
      </p>
    );
  }

  if (!ready) {
    return (
      <div className="flex items-center gap-2 text-sm text-gray-500">
        <Loader simple className="h-5 w-5" />
        Загрузка подсказок Яндекса…
      </div>
    );
  }

  return (
    <div ref={wrapRef} className="relative space-y-2">
      <Label>Адрес для покупателей (текст + подсказки Яндекса)</Label>
      <div className="relative">
        <TextArea
          ref={textareaRef}
          name={name}
          placeholder="Введите адрес текстом или выберите подсказку из списка при вводе"
          value={value}
          onChange={(e) => {
            onAddressChange(e.target.value);
            setOpen(true);
          }}
          onBlur={onBlur}
          onFocus={() => value.trim().length >= 2 && setOpen(true)}
          variant="outline"
          className="min-h-[96px]"
          error={error}
        />
        {loading && (
          <span className="absolute end-3 top-1/2 -translate-y-1/2">
            <Loader simple className="h-5 w-5" />
          </span>
        )}
        {open && suggestions.length > 0 && (
          <ul className="absolute z-20 mt-1 max-h-56 w-full overflow-auto rounded border border-border-base bg-white py-1 shadow-lg">
            {suggestions.map((item, idx) => {
              const label = item?.displayName || item?.value || String(item);
              const key = `${idx}-${label}`;
              return (
                <li key={key}>
                  <button
                    type="button"
                    className="w-full px-3 py-2 text-left text-sm hover:bg-gray-50"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => pickItem(item)}
                  >
                    {label}
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
      <button
        type="button"
        className="text-xs text-accent underline hover:no-underline"
        onClick={geocodeCurrentText}
        disabled={!value?.trim()}
      >
        Подставить координаты по текущему тексту адреса (без выбора из списка)
      </button>
    </div>
  );
}
