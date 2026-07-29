import { getProffiAdmin } from '@/data/proffi-admin';
import { useEffect, useMemo, useState } from 'react';

type RussiaCity = {
  id: string | number;
  name?: string;
  name_ru?: string;
  region?: string | null;
  region_ru?: string | null;
};

type RussiaCityInputProps = {
  value: string;
  onChange: (value: string) => void;
  onSelect?: (city: RussiaCity) => void;
  placeholder?: string;
  required?: boolean;
  className?: string;
};

const POPULAR_RUSSIA_CITIES = [
  'Москва',
  'Санкт-Петербург',
  'Новосибирск',
  'Екатеринбург',
  'Казань',
  'Нижний Новгород',
  'Краснодар',
  'Самара',
  'Ростов-на-Дону',
  'Уфа',
];

export default function RussiaCityInput({
  value,
  onChange,
  onSelect,
  placeholder = 'Город',
  required,
  className = 'rounded border border-border-200 px-3 py-2',
}: RussiaCityInputProps) {
  const [options, setOptions] = useState<RussiaCity[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const list = useMemo(() => {
    if (options.length) return options;
    return POPULAR_RUSSIA_CITIES.map((name) => ({ id: name, name_ru: name }));
  }, [options]);

  useEffect(() => {
    const query = value.trim();
    if (query.length < 2) {
      setOptions([]);
      return;
    }

    const timer = window.setTimeout(() => {
      setLoading(true);
      getProffiAdmin<{ data?: RussiaCity[] }>(`/api/locations/russia/search?q=${encodeURIComponent(query)}&limit=8&type=city`)
        .then((payload) => setOptions(payload.data || []))
        .catch(() => setOptions([]))
        .finally(() => setLoading(false));
    }, 250);

    return () => window.clearTimeout(timer);
  }, [value]);

  return (
    <div className="relative">
      <input
        className={className}
        placeholder={placeholder}
        value={value}
        onChange={(event) => {
          onChange(event.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => window.setTimeout(() => setOpen(false), 150)}
        required={required}
        autoComplete="off"
      />
      {open ? (
        <div className="absolute left-0 right-0 top-full z-20 mt-1 max-h-56 overflow-auto rounded border border-border-200 bg-light shadow-lg">
          {loading ? <div className="px-3 py-2 text-sm text-body">Поиск города…</div> : null}
          {!loading && list.length ? (
            list.map((city) => {
              const cityName = city.name_ru || city.name || String(city.id);
              const region = city.region_ru || city.region;
              return (
                <button
                  key={`${city.id}-${cityName}`}
                  type="button"
                  className="block w-full px-3 py-2 text-left text-sm hover:bg-gray-50"
                  onMouseDown={(event) => {
                    event.preventDefault();
                    onChange(cityName);
                    onSelect?.(city);
                    setOpen(false);
                  }}
                >
                  <span className="font-medium text-heading">{cityName}</span>
                  {region ? <span className="ml-2 text-xs text-body">{region}</span> : null}
                </button>
              );
            })
          ) : null}
          {!loading && !list.length ? <div className="px-3 py-2 text-sm text-body">Начните вводить город РФ</div> : null}
        </div>
      ) : null}
    </div>
  );
}
