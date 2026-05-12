# Profi Marketplace MVP — PRD

## Original problem statement
Full-stack MVP marketplace similar to Profi.ru. Location-based service marketplace where customers post tasks and specialists apply and chat. NO payments, NO wallet, NO subscriptions. UI is reference-based (uploaded screenshots).

## User choices (locked-in)
- Auth: JWT custom (phone + password)
- Roles: two separate roles chosen at signup (customer | specialist)
- Chat: polling every 3s
- Languages: Russian + Romanian (live toggle)
- UI: mobile-first, max-w-440px container, Manrope font, monochrome (white/lavender/black) modeled on supplied screenshots
- Map: Leaflet + OpenStreetMap (free, no API key)
- Storage: Emergent object storage for task photos
- Sort: distance-by-default once geolocation is granted

## Personas
1. Customer — posts tasks (with photos + geo), reviews applications, accepts one specialist, chats.
2. Specialist — browses open tasks (List/Map, distance-sorted), applies with message+price, chats once accepted.

## Implemented (Iteration 1 — Feb 2026)
- Auth (JWT phone+password), Onboarding, Register (role switcher), Login
- Categories, Tasks CRUD, Applications, Accept→auto-create chat, Polling chat
- Profile (view+edit), Specialist public profile, RU/RO i18n
- 26/26 backend tests passed

## Implemented (Iteration 2 — Feb 2026)
- Stories carousel banner (`/api/stories` x4 banners)
- Redesigned TaskCard: time+red dot, title, price line, description, 2-up photo gallery, location row with home icon + distance, dates row, category tag, applications count
- List / Map toggle at top of feed
- Map view with Leaflet + OpenStreetMap, black circular markers, locate-me, list-count badge, bottom sheet with nearest task
- Geolocation: browser API → saved in localStorage + user profile, sent on feed requests, default sort by Haversine distance
- Filters bottom sheet (categories grid + city)
- Photo upload (Emergent object storage) — up to 5 photos per task, JPEG/PNG/WebP, 8MB limit
- Specialist "Заказы" tab now routes to the feed (matching the reference UX)
- 37/37 backend tests passed (26 regression + 11 new)

## Backlog (P0 — next)
- Photos in task detail viewer with full-screen lightbox
- Reverse-geocode lat/lng → human-readable address line on task creation
- Marker clustering on map (using `leaflet.markercluster`) once tasks exceed ~30
- Pull-to-refresh on feed

## Backlog (P1)
- Reviews & ratings after task completion
- Push/in-app notifications for new applications / messages
- Saved/favourite tasks
- Profile photo upload

## Backlog (P2)
- Phone SMS verification (Twilio)
- Map heat-map view, advanced filters (budget range, deadline)
- Admin moderation dashboard

## Implemented (Iteration 3 — Feb 2026)
- TaskDetail redesign matching screenshots: photo carousel with N/total indicator, "Заказ № …" with order timestamps, "В этом заказе ваш отклик будет N-м по рейтингу" info banner, "Клиент пока ни с кем не обменялся контактами" warning banner, customer card (avatar + "В сети …"), "Описание" section, meta card, sticky bottom "Написать клиенту" CTA (changes to "Чаты" if already applied).
- New backend endpoint `GET /api/tasks/{id}/specialist-info` returns has_applied, rank by rating, total_applications, customer block.
- Chats list with status tabs (Открытые / В работе / Выполненные / Архив), colored avatar bubbles per chat partner, double-tick indicator, "Клиент увидел отклик" hint, server-side status filter via `GET /api/chats?status=open|in_progress|completed`.
- Profile (Анкета) redesign: large square avatar with camera-upload button, star rating + reviews + "Очень хвалят", name with inline edit, "Паспорт проверен" verification tag, "Моя статистика" row, 3-up stats grid (Откликов / Принято / Активных чатов for specialists; Заказов / Открытых / В работе for customers), "О себе" inline-editable section, services chips, phone+city footer, settings/logout in top-right.
- Backend `GET /api/auth/stats` (per-role stats), avatar field in PATCH /auth/profile, `last_seen` tracked on each /auth/me call (now returns the fresh value).
- Backend: 51/51 tests passing (37 regression + 14 new).
