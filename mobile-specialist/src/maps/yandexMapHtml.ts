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

function stripHtml(value: unknown): string {
  return String(value ?? "")
    .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?>[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#039;/gi, "'")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/\s+/g, " ")
    .trim();
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
        box-sizing: border-box;
        width: 148px;
        min-height: 46px;
        background: #232323;
        color: #fff;
        padding: 7px 9px;
        border-radius: 10px;
        cursor: pointer;
        box-shadow: 0 6px 16px rgba(0,0,0,0.18);
        font-family: inherit;
        font-size: 11px;
        font-weight: 400;
      }
      .plaque.active { outline: 1px solid #D9F36B; outline-offset: 2px; }
      .plaque-photo { width: 100%; height: 46px; object-fit: cover; border-radius: 7px; margin-bottom: 6px; display: block; }
      .plaque-price { font-size: 11px; font-weight: 500; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
      .plaque-title { font-size: 11px; font-weight: 500; margin-top: 3px; line-height: 1.25; overflow: hidden; text-overflow: ellipsis; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; }
      .plaque-location { font-size: 10px; font-weight: 400; margin-top: 3px; line-height: 1.25; opacity: 0.78; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
      .plaque-cta { font-size: 10px; font-weight: 400; margin-top: 4px; opacity: 0.65; }
      .cluster {
        width: 44px; height: 44px; border-radius: 50%; background: #D9F36B; color: #232323;
        border: 3px solid #fff; box-shadow: 0 8px 24px rgba(0,0,0,.24); display: flex;
        align-items: center; justify-content: center; box-sizing: border-box; font-size: 15px; font-weight: 800;
      }
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
            '<div class="plaque-price">{{ properties.priceLabel }}</div>' +
            '<div class="plaque-title">{{ properties.title }}</div>' +
            '<div class="plaque-cta">Открыть задание →</div>' +
          '</div>'
        );
      }
      function createClusterLayout(ymaps) {
        return ymaps.templateLayoutFactory.createClass('<div class="cluster">{{ properties.geoObjects.length }}</div>');
      }
      window.__proffiMap = {
        map: null,
        placemarks: {},
        clusterer: null,
        layout: null,
        didFitBounds: false,
        init: function () {
          var self = this;
          ymaps.ready(function () {
            self.layout = createPlaqueLayout(ymaps);
            self.clusterer = new ymaps.Clusterer({
              clusterDisableClickZoom: false,
              clusterOpenBalloonOnClick: false,
              groupByCoordinates: false,
              gridSize: 96,
              hasBalloon: false,
              hasHint: false,
              clusterIconLayout: createClusterLayout(ymaps),
              clusterIconShape: { type: 'Circle', coordinates: [22, 22], radius: 24 }
            });
            self.map = new ymaps.Map('map', {
              center: [${MOSCOW_CENTER.lat}, ${MOSCOW_CENTER.lng}],
              zoom: 10,
              controls: ['zoomControl', 'geolocationControl']
            }, { suppressMapOpenBlock: true });
            var emitBounds = function () {
              if (!self.map) return;
              post('boundschange', readBounds(self.map));
            };
            // actionend fires once after pan/zoom. Listening to boundschange as
            // well produced an event loop in React Native while the map was
            // fitting clusters and resizing its viewport.
            self.map.events.add('actionend', emitBounds);
            self.clusterer.events.add('click', function (event) {
              var target = event.get('target');
              if (!target || typeof target.getGeoObjects !== 'function') return;
              var objects = target.getGeoObjects();
              if (!objects || objects.length < 2) return;
              var bounds = ymaps.geoQuery(objects).getBounds();
              if (bounds) self.map.setBounds(bounds, { checkZoomRange: true, zoomMargin: 48, duration: 250 });
            });
            self.map.geoObjects.add(self.clusterer);
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
          self.clusterer.removeAll();
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
              iconContentOffset: [-74, -54],
              iconContentSize: [148, 54],
              iconShape: { type: 'Rectangle', coordinates: [[-74, -54], [74, 0]] },
              zIndex: active ? 1000 : 1
            });
            placemark.events.add('click', function () {
              post('select', { id: point.id });
            });
            self.clusterer.add(placemark);
            self.placemarks[point.id] = placemark;
          });
          if (!self.didFitBounds && points && points.length === 1 && !highlightedId) {
            self.map.setCenter([points[0].lat, points[0].lng], 13);
            self.didFitBounds = true;
          } else if (!self.didFitBounds && points && points.length > 1 && !highlightedId) {
            var bounds = self.clusterer.getBounds();
            if (bounds) self.map.setBounds(bounds, { checkZoomRange: true, zoomMargin: 48 });
            self.didFitBounds = true;
          }
          // Do not fit the viewport on every React points update: it emits map
          // bounds events and used to recreate the same black marker forever.
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
  budget_type?: string | null;
  budget_min?: number | null;
  budget_max?: number | null;
  budget_label?: string | null;
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

      let priceLabel = task.budget_label || "Цена договорная";
      if (!task.budget_label && task.budget_type === "range") {
        const min = task.budget_min != null ? Number(task.budget_min) : null;
        const max = task.budget_max != null ? Number(task.budget_max) : null;
        if (min != null && max != null) priceLabel = `от ${new Intl.NumberFormat("ru-RU").format(min)} до ${new Intl.NumberFormat("ru-RU").format(max)} ₽`;
        else if (min != null) priceLabel = `от ${new Intl.NumberFormat("ru-RU").format(min)} ₽`;
        else if (max != null) priceLabel = `до ${new Intl.NumberFormat("ru-RU").format(max)} ₽`;
      } else if (!task.budget_label && task.budget != null && task.budget > 0) {
        priceLabel = `от ${new Intl.NumberFormat("ru-RU").format(task.budget)} ₽`;
      }

      return {
        id: String(task.id),
        title: stripHtml(task.title),
        description: stripHtml(task.description),
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
