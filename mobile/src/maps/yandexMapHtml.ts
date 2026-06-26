export type YandexMapPoint = {
  id: string;
  title: string;
  description?: string | null;
  price?: string | null;
  city?: string | null;
  lat: number;
  lng: number;
};

export const MOSCOW_CENTER = { lat: 55.7558, lng: 37.6173 };

function escapeHtml(value: unknown): string {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

export function yandexMapsApiKey(): string {
  return process.env.EXPO_PUBLIC_YANDEX_MAPS_API_KEY || "";
}

export function pointBalloon(point: YandexMapPoint): string {
  const price = point.price ? `<div class="price">${escapeHtml(point.price)}</div>` : "";
  const city = point.city ? `<div class="meta">${escapeHtml(point.city)}</div>` : "";
  const description = point.description ? `<div class="desc">${escapeHtml(point.description)}</div>` : "";
  return `
    <div class="balloon">
      <div class="title">${escapeHtml(point.title)}</div>
      ${price}
      ${description}
      ${city}
    </div>
  `;
}

export function formatMapOrderCount(count: number, lang: string): string {
  const mod10 = count % 10;
  const mod100 = count % 100;
  const word = mod10 === 1 && mod100 !== 11
    ? "заказ"
    : mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)
      ? "заказа"
      : "заказов";
  return `${count} ${word}`;
}

export function buildYandexMapHtml(points: YandexMapPoint[], apiKey: string): string {
  const safePoints = JSON.stringify(points);
  const scriptSrc = `https://api-maps.yandex.ru/2.1/?apikey=${encodeURIComponent(apiKey)}&lang=ru_RU`;
  return `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no" />
    <style>
      html, body, #map { width: 100%; height: 100%; margin: 0; padding: 0; overflow: hidden; }
      body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; background: #f5f3ff; }
      .balloon { max-width: 220px; color: #111; }
      .title { font-size: 15px; font-weight: 800; margin-bottom: 6px; }
      .price { font-size: 14px; font-weight: 800; margin-bottom: 4px; }
      .desc { font-size: 13px; line-height: 17px; margin-bottom: 6px; color: #444; }
      .meta { font-size: 12px; color: #666; }
      .empty, .error {
        position: absolute; inset: 0; display: flex; align-items: center; justify-content: center;
        padding: 24px; text-align: center; color: #555; font-size: 14px; line-height: 20px;
      }
    </style>
    <script src="${scriptSrc}"></script>
  </head>
  <body>
    <div id="map"></div>
    <script>
      const points = ${safePoints};
      function post(type, payload) {
        if (window.ReactNativeWebView) {
          window.ReactNativeWebView.postMessage(JSON.stringify({ type, payload }));
        }
      }
      function showMessage(className, text) {
        document.body.innerHTML = '<div class="' + className + '">' + text + '</div>';
      }
      if (!points.length) {
        showMessage('empty', 'Заказов с координатами пока нет');
      } else {
        ymaps.ready(function () {
          const center = points.length ? [points[0].lat, points[0].lng] : [${MOSCOW_CENTER.lat}, ${MOSCOW_CENTER.lng}];
          const map = new ymaps.Map('map', {
            center,
            zoom: points.length === 1 ? 13 : 10,
            controls: ['zoomControl', 'geolocationControl']
          }, { suppressMapOpenBlock: true });
          const collection = new ymaps.GeoObjectCollection();
          points.forEach(function (point) {
            const placemark = new ymaps.Placemark([point.lat, point.lng], {
              balloonContent: point.balloon,
              hintContent: point.title
            }, {
              preset: 'islands#blackStretchyIcon',
              iconColor: '#111111'
            });
            placemark.events.add('click', function () { post('select', { id: point.id }); });
            collection.add(placemark);
          });
          map.geoObjects.add(collection);
          if (points.length > 1) {
            map.setBounds(collection.getBounds(), { checkZoomRange: true, zoomMargin: 48 });
          }
          post('ready', { count: points.length });
        });
      }
    </script>
  </body>
</html>`;
}

export function toYandexPoints<T extends {
  id: string | number;
  title: string;
  description?: string | null;
  budget?: number | null;
  city?: string | null;
  lat?: number | string | null;
  lng?: number | string | null;
}>(tasks: T[]): YandexMapPoint[] {
  return tasks
    .filter(
      (task) =>
        task.lat != null &&
        task.lng != null &&
        task.lat !== "" &&
        task.lng !== "" &&
        Number.isFinite(Number(task.lat)) &&
        Number.isFinite(Number(task.lng))
    )
    .map((task) => ({
      id: String(task.id),
      title: task.title,
      description: task.description,
      price: task.budget != null && task.budget > 0 ? `${task.budget} ₽` : null,
      city: task.city,
      lat: Number(task.lat),
      lng: Number(task.lng),
    }));
}
