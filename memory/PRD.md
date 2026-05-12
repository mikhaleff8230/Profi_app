# Profi Marketplace MVP — PRD

## Original problem statement
Full-stack MVP marketplace similar to Profi.ru. Location-based service marketplace where customers post tasks and specialists apply and chat. NO payments, NO wallet, NO subscriptions. UI is reference-based (uploaded screenshots).

## User choices (locked-in)
- Auth: JWT custom (phone + password)
- Roles: two separate roles chosen at signup (customer | specialist)
- Chat: polling every 3s
- Languages: Russian + Romanian (live toggle)
- UI: mobile-first, max-w-440px container, Manrope font, monochrome (white / lavender / black) modeled on the supplied screenshots.

## Personas
1. Customer — посts tasks, browses applications, accepts one specialist, chats.
2. Specialist — browses open tasks, applies with message+price, chats once accepted, manages profile.

## Implemented (Iteration 1 — Feb 2026)
- FastAPI backend (`/app/backend/server.py`) — auth, categories, tasks CRUD, applications, accept-and-create-chat, messages, profile, specialist public profile.
- React frontend with: Onboarding, Login, Register (role switcher), Home (categories + open tasks + search), TasksList with category/q filters, CreateTask, TaskDetail (apply flow / applications list / accept), Orders (my tasks / my apps), Chats list, ChatDetail (polling 3s), Profile (view + edit), SpecialistProfile.
- RU/RO i18n via `i18n.jsx` with localStorage persistence.
- 26/26 backend pytest passed.

## Backlog (P0 — next iteration, based on Feb 2026 screenshots)
- **Feed redesign**: card with time-ago + red unread dot, title, multi-line description, photo gallery (2-up), location row with house icon, dates row with calendar icon.
- **Список / Карта toggle** at top of feed.
- **Map view** with geo-clustered markers (mock with Leaflet/OSM tiles since Yandex Maps requires paid API).
- **Filters sheet** triggered by sliders icon next to search.
- **Story-style banners** carousel at top of feed (4 promo tiles).
- **Geolocation-based sorting**: capture user's lat/lng (browser geolocation API), backend stores task lat/lng, sort feed by Haversine distance.
- **Task photo uploads** (object storage integration).

## Backlog (P1)
- Reviews & ratings after task completion.
- Push/in-app notifications for new applications / messages.
- Specialist search by category with rating/distance filters.
- Saved/favourite tasks.

## Backlog (P2)
- Phone SMS verification (Twilio).
- Profile photo uploads.
- Map clustering optimisation.
- Admin dashboard.
