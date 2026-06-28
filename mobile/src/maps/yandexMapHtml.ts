export type YandexMapPoint = {
  id: string;
  title: string;
  description?: string | null;
  price?: string | null;
  priceLabel?: string | null;
  city?: string | null;
  address?: string | null;
  category?: string | number | null;
  photoUrl?: string | null;
  lat: number;
  lng: number;
};

export type MapBoundsPayload = {
  southWest: [number, number];
  northEast: [number, number];
};

export const MOSCOW_CENTER = { lat: 55.7558, lng: 37.6173 };

const TRANSPARENT_PIXEL =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==";

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

export function formatMapOrderCount(count: number, _lang: string): string {
  const mod10 = count % 10;
  const mod100 = count % 100;
  const word =
    mod10 === 1 && mod100 !== 11
      ? "заказ"
      : mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)
        ? "заказа"
        : "заказов";
  return `${count} ${word}`;
}

export function buildYandexMapShellHtml(apiKey: string): string {
  const scriptSrc = `https://api-maps.yandex.ru/2.1/?apikey=${encodeURIComponent(apiKey)}&lang=ru_RU`;
  return `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no" />
    <style>
      html, body, #map { width: 100%; height: 100%; margin: 0; padding: 0; overflow: hidden; }
      body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; background: #f5f3ff; }
      .plaque {
        background: #232323;
        color: #fff;
        padding: 10px 12px;
        border-radius: 14px;
        cursor: pointer;
        box-shadow: 0 8px 24px rgba(0,0,0,0.28);
        max-width: 220px;
        font-family: inherit;
      }
      .plaque.active { outline: 2px solid #D9F36B; outline-offset: 2px; }
      .plaque-photo { width: 100%; height: 64px; object-fit: cover; border-radius: 8px; margin-bottom: 8px; display: block; }
      .plaque-price { font-size: 12px; font-weight: 700; white-space: nowrap; }
      .plaque-title { font-size: 12px; font-weight: 800; margin-top: 4px; line-height: 1.35; }
      .plaque-location { font-size: 11px; margin-top: 4px; line-height: 1.35; opacity: 0.9; }
      .plaque-cta { font-size: 10px; margin-top: 6px; opacity: 0.75; }
    </style>
    <script src="${scriptSrc}"></script>
  </head>
  <body>
    <div id="map"></div>
    <script>
      function post(type, payload) {
        var msg = JSON.stringify({ type: type, payload: payload || {} });
        if (window.ReactNativeWebView) window.ReactNativeWebView.postMessage(msg);
        if (window.parent && window.parent !== window) window.parent.postMessage(msg, '*');
      }
      function readBounds(map) {
        var bounds = map.getBounds();
        return { southWest: bounds[0], northEast: bounds[1] };
      }
      function escapeHtmlClient(value) {
        return String(value == null ? '' : value)
          .replace(/&/g, '&amp;')
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;')
          .replace(/"/g, '&quot;')
          .replace(/'/g, '&#039;');
      }
      function escapeAttrClient(value) {
        return escapeHtmlClient(value).replace(/\x60/g, '&#096;');
      }
      function createPlaqueLayout(ymaps) {
        return ymaps.templateLayoutFactory.createClass(
          '<div class="plaque {{ properties.activeClass }}">' +
            '{{ properties.photoBlock }}' +
            '<div class="plaque-price">{{ properties.priceLabel }}</div>' +
            '<div class="plaque-title">{{ properties.title }}</div>' +
            '{{ properties.locationBlock }}' +
            '<div class="plaque-cta">Открыть задание →</div>' +
          '</div>'
        );
      }
      window.__proffiMap = {
        map: null,
        placemarks: {},
        layout: null,
        init: function () {
          var self = this;
          ymaps.ready(function () {
            self.layout = createPlaqueLayout(ymaps);
            self.map = new ymaps.Map('map', {
              center: [${MOSCOW_CENTER.lat}, ${MOSCOW_CENTER.lng}],
              zoom: 10,
              controls: ['zoomControl', 'geolocationControl']
            }, { suppressMapOpenBlock: true });
            var emitBounds = function () {
              if (!self.map) return;
              post('boundschange', readBounds(self.map));
            };
            self.map.events.add('actionend', emitBounds);
            self.map.events.add('boundschange', emitBounds);
            window.addEventListener('resize', function () {
              if (!self.map) return;
              self.map.container.fitToViewport();
              emitBounds();
            });
            post('ready', {});
            emitBounds();
          });
        },
        updatePoints: function (points, highlightedId) {
          var self = this;
          if (!self.map || !self.layout) return;
          Object.keys(self.placemarks).forEach(function (id) {
            self.map.geoObjects.remove(self.placemarks[id]);
          });
          self.placemarks = {};
          (points || []).forEach(function (point) {
            var active = highlightedId && String(highlightedId) === String(point.id);
            var photoBlock = point.photoUrl
              ? '<img class="plaque-photo" src="' + escapeAttrClient(point.photoUrl) + '" alt="" />'
              : '';
            var location = [point.city, point.address].filter(Boolean).join(', ');
            var locationBlock = location
              ? '<div class="plaque-location">' + escapeHtmlClient(location) + '</div>'
              : '';
            var placemark = new ymaps.Placemark([point.lat, point.lng], {
              priceLabel: escapeHtmlClient(point.priceLabel || point.price || 'Цена договорная'),
              title: escapeHtmlClient(point.title),
              photoBlock: photoBlock,
              locationBlock: locationBlock,
              activeClass: active ? 'active' : '',
              hintContent: point.title
            }, {
              iconLayout: 'default#imageWithContent',
              iconImageHref: '${TRANSPARENT_PIXEL}',
              iconImageSize: [1, 1],
              iconImageOffset: [0, 0],
              iconContentLayout: self.layout,
              iconContentOffset: [-88, -72],
              iconContentSize: [176, 120],
              zIndex: active ? 1000 : 1
            });
            placemark.events.add('click', function () {
              post('select', { id: point.id });
            });
            self.map.geoObjects.add(placemark);
            self.placemarks[point.id] = placemark;
          });
          if (points && points.length === 1 && !highlightedId) {
            self.map.setCenter([points[0].lat, points[0].lng], 13);
          } else if (points && points.length > 1 && !highlightedId) {
            var collection = new ymaps.GeoObjectCollection();
            points.forEach(function (p) { collection.add(self.placemarks[p.id]); });
            var bounds = collection.getBounds();
            if (bounds) self.map.setBounds(bounds, { checkZoomRange: true, zoomMargin: 48 });
          }
          if (self.map) self.map.container.fitToViewport();
        },
        setCenter: function (lat, lng, zoom) {
          if (!this.map) return;
          this.map.setCenter([lat, lng], zoom || 12);
          this.map.container.fitToViewport();
        }
      };
      window.__proffiMap.init();
    </script>
  </body>
</html>`;
}

export function buildMapUpdateScript(points: YandexMapPoint[], highlightedId?: string | null): string {
  const safePoints = JSON.stringify(points);
  const safeHighlight = JSON.stringify(highlightedId ?? null);
  return `window.__proffiMap && window.__proffiMap.updatePoints(${safePoints}, ${safeHighlight}); true;`;
}

export function buildMapCenterScript(lat: number, lng: number, zoom = 12): string {
  return `window.__proffiMap && window.__proffiMap.setCenter(${lat}, ${lng}, ${zoom}); true;`;
}

export function toYandexPoints<T extends {
  id: string | number;
  title: string;
  description?: string | null;
  budget?: number | null;
  city?: string | null;
  address?: string | null;
  category?: string | number | null;
  photos?: Array<string | { url?: string | null; path?: string | null }> | null;
  lat?: number | string | null;
  lng?: number | string | null;
}>(tasks: T[], fileUrlFn?: (path: string) => string | null): YandexMapPoint[] {
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
    .map((task) => {
      const firstPhoto = task.photos?.[0];
      let photoUrl: string | null = null;
      if (typeof firstPhoto === "string") {
        photoUrl = firstPhoto.startsWith("http") ? firstPhoto : fileUrlFn?.(firstPhoto) || null;
      } else if (firstPhoto?.url) {
        photoUrl = firstPhoto.url;
      } else if (firstPhoto?.path && fileUrlFn) {
        photoUrl = fileUrlFn(firstPhoto.path);
      }

      const priceLabel =
        task.budget != null && task.budget > 0
          ? `от ${new Intl.NumberFormat("ru-RU").format(task.budget)} ₽`
          : "Цена договорная";

      return {
        id: String(task.id),
        title: task.title,
        description: task.description,
        price: priceLabel,
        priceLabel,
        city: task.city,
        address: task.address,
        category: task.category ? String(task.category) : null,
        photoUrl,
        lat: Number(task.lat),
        lng: Number(task.lng),
      };
    });
}

/** @deprecated Используйте buildYandexMapShellHtml + buildMapUpdateScript */
export function buildYandexMapHtml(points: YandexMapPoint[], apiKey: string): string {
  return buildYandexMapShellHtml(apiKey);
}

/** @deprecated Плашки вместо balloon */
export function pointBalloon(point: YandexMapPoint): string {
  const price = point.price ? `<div class="price">${escapeHtml(point.price)}</div>` : "";
  const city = point.city ? `<div class="meta">${escapeHtml(point.city)}</div>` : "";
  const address = point.address ? `<div class="meta">${escapeHtml(point.address)}</div>` : "";
  return `<div class="balloon"><div class="title">${escapeHtml(point.title)}</div>${price}${address}${city}</div>`;
}
