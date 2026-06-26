type Props = {
  lat?: number;
  lng?: number;
};

/**
 * Лёгкое превью без API-ключей (OpenStreetMap embed).
 */
export default function ShippingMapPreview({ lat, lng }: Props) {
  if (
    lat == null ||
    lng == null ||
    Number.isNaN(lat) ||
    Number.isNaN(lng) ||
    !Number.isFinite(lat) ||
    !Number.isFinite(lng)
  ) {
    return (
      <div className="flex h-[200px] max-w-xl items-center justify-center rounded-lg border border-gray-200 bg-gray-50 text-center text-sm text-gray-500">
        Укажите широту и долготу — здесь появится карта с меткой
      </div>
    );
  }

  const delta = 0.02;
  const bbox = `${lng - delta},${lat - delta},${lng + delta},${lat + delta}`;
  const src = `https://www.openstreetmap.org/export/embed.html?bbox=${encodeURIComponent(
    bbox
  )}&layer=map&marker=${lat}%2C${lng}`;

  return (
    <iframe
      title="Превью адреса на карте"
      className="h-[200px] w-full max-w-xl rounded-lg border border-gray-200"
      loading="lazy"
      referrerPolicy="no-referrer-when-downgrade"
      src={src}
    />
  );
}
