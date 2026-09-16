# План интеграции Places в TREABO/Proffi

План основан на аудите фактического Laravel-кода от 16 сентября 2026 года.

## Принципы

- `places` остаётся таблицей опубликованных работ/portfolio/discovery.
- `proffi_tasks` остаётся таблицей заявок на будущую работу.
- Новый API изолирует TREABO от legacy Marvel response contracts.
- Переиспользуются user, media storage, category/work, reviews, presence, favorites и AI RequestDraft flow.
- Все schema changes additive; legacy routes/resources не меняются.

## Этап 1. Schema и relations

Создать одну migration в `pixer-api/database/migrations`:

- `places`: nullable `category_id`, `work_id`, `price`, `city`, `location_id`, `lat`, `lng`, `duration_days`, `published_at`, `source_task_id`; `hide_price`; `status` с default `published`; фильтрационные индексы и FK с `nullOnDelete`;
- `place_images`: `sort_order`, `is_cover`, индекс `(place_id, sort_order)`;
- `request_drafts`: nullable FK `source_place_id`;
- `proffi_tasks`: nullable FK `source_place_id`.

Обновить relations/casts в:

- `packages/marvel/src/Database/Models/Place.php`;
- `packages/marvel/src/Database/Models/PlaceImage.php`;
- `packages/marvel/src/Database/Models/User.php`;
- `app/Models/RequestDraft.php`;
- `app/Models/ProffiTask.php`.

Явно зарегистрировать `Marvel\Policies\PlacePolicy` в `app/Providers/AuthServiceProvider.php`.

## Этап 2. TREABO Place layer

Создать:

- `app/Services/Proffi/PlaceService.php` — list filters, CRUD, publication lifecycle, gallery sync и ownership/source-task checks;
- `app/Http/Controllers/Proffi/ProffiPlaceController.php` — тонкий HTTP adapter;
- `app/Http/Requests/Proffi/StorePlaceRequest.php`;
- `app/Http/Requests/Proffi/UpdatePlaceRequest.php`;
- `app/Http/Requests/Proffi/ListPlacesRequest.php`;
- `app/Http/Resources/Proffi/PlaceListResource.php`;
- `app/Http/Resources/Proffi/PlaceDetailResource.php`.

List filters: pagination, category/work, city, viewport, price range, with photo, author, favorites, search; sorts `new`, `nearby`, `popular`. Popular использует реальные wishlist/like counts. Radius не включается, пока task geo API не имеет общего проверенного radius implementation.

Новый API:

- публичные `GET /api/proffi/places`, `GET /api/proffi/places/{place}`, `GET /api/proffi/users/{user}/places`;
- auth `GET /api/proffi/places/mine`, POST/PATCH/DELETE, favorite add/remove;
- auth `POST /api/proffi/places/{place}/create-request`;
- auth `POST /api/proffi/tasks/{task}/place-draft`.

`mine` объявить раньше dynamic `{place}` route.

## Этап 3. Place → RequestDraft → Task

Создать `app/Services/Proffi/PlaceToRequestDraftService.php`.

Сервис передаёт в существующий `RequestDraftOrchestrator` reference context: place id/title/description, category/work, visible price, ordered photos и metadata. Reference context маркируется как пример, а не требования заявки. Location Place не подтверждается как location новой заявки.

Точечно расширить `RequestDraftOrchestrator` внутренним trusted context:

- создать draft с `source_place_id` и выбранными category/work;
- сохранить `reference_place` в snapshot;
- первым assistant turn спросить, что пользователь хочет изменить;
- первый пользовательский ответ продолжает существующий `DialogueInferenceService` и `ConditionalQuestionEngine`.

Расширить `DialogueInferenceService` полем reference context в `known`, без нового prompt/service.

Расширить `RequestDraftPublisher` переносом `source_place_id` в `ProffiTask` и `ai_details`. Прямой `POST /tasks` остаётся без source и не меняет стандартный flow.

## Этап 4. Task → Place draft

Создать `app/Services/Proffi/TaskToPlaceDraftService.php`.

Правила:

- task status должен быть `done` или `completed`;
- caller должен быть `accepted_specialist_id` или иметь accepted/completed application для legacy data;
- создаётся `Place(status=draft, source_task_id=task.id)`;
- переносятся category/work и location, формируются редактируемые title/description;
- task photos автоматически не публикуются и не копируются: мастер выбирает/загружает разрешённые фото сам;
- endpoint идемпотентно возвращает уже существующий draft того же мастера и task.

Публикация выполняется только отдельным PATCH после проверки формы.

## Этап 5. Favorites, profile, map и resources

- Favorites используют `place_wishlists`; `proffi_favorites` для tasks не изменяется.
- User Places используют тот же list resource.
- Author DTO получает rating/reviews из `ProffiReview`, online из `ProffiUserPresence`, places count через eager aggregate.
- Gallery сортируется по `sort_order`, cover выбирается по `is_cover` с fallback на первый image.
- List resource остаётся лёгким, detail добавляет description/gallery/location/duration/review summary.
- List response содержит lat/lng и cover, достаточные для frontend `PlaceMapAdapter`, без полной gallery и reviews.

## Этап 6. Admin

Добавить в общий `$proffiAdminRoutes`:

- list/detail Places;
- update status (`draft`, `published`, `hidden`, `archived`);
- delete;
- source task и conversion metadata в admin DTO.

Отдельную большую admin UI на этом этапе не создавать.

## Этап 7. Tests и regression

Добавить feature tests для:

- create/update/foreign-owner denial/publication/hide price;
- list/detail/category-work/viewport/favorites/user Places;
- Place → RequestDraft context/category/work/source;
- RequestDraftPublisher → Task source;
- completed Task → Place draft и source-task authorization;
- обычный Task creation без source.

Проверки:

- PHP syntax для изменённых файлов;
- targeted PHPUnit suite;
- route list для `/api/proffi/places`;
- existing RequestDraft Assistant tests;
- git diff review без изменения legacy response contracts.

## Файлы, которые нельзя ломать

- `packages/marvel/src/Http/Controllers/PlaceController.php` и его legacy upload/video/SEO behavior;
- `PlaceResource`, `PlaceFeedResource`, `packages/marvel/src/Rest/Routes.php`;
- `ProffiTask` applications/balance/chat/matching controllers and tables;
- существующие RequestDraft public contracts;
- task favorite table/contract;
- legacy parser, sitemap, Elasticsearch и billing dependencies.
