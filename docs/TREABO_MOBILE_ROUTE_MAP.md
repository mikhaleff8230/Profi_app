# TREABO 2.0 — Mobile Route Map

Статусы:

- `REUSE` — существующий экран можно подключить без изменения его основного UX;
- `ADAPT` — сохранить экран и API, добавить route adapter/role-aware entry;
- `REPLACE LATER` — временно оставить существующий экран под новым верхнеуровневым route, затем заменить по отдельному ТЗ и референсу;
- `RESERVE` — зафиксировать typed route contract, UI пока не создавать.

---

## Новая верхнеуровневая navigation

### NEW ROUTE: `Home`

**EXISTING:**

- client: `mobile/screens/HomeScreen.tsx` — «Мои заявки»;
- specialist: `mobile-specialist/screens/HomeScreen.tsx` — доступные заявки.

**ACTION:** `REPLACE LATER`

До отдельного Home/Places ТЗ route может использовать текущий безопасный entry, но существующий экран не считается будущим Places Feed.

---

### NEW ROUTE: `Map`

**EXISTING:**

- `screens/MapScreen.tsx`;
- `screens/MapScreen.web.tsx`;
- specialist `TasksStack/Map` уже зарегистрирован;
- client файлы присутствуют, route описан в типах, но не зарегистрирован.

**ACTION:** `REUSE`

Сохранить Yandex Map без визуальной переделки. Будущие режимы `Places | Заявки` добавить позже.

---

### NEW ROUTE: `CreateAction`

**EXISTING:** client tab `Create` — placeholder, tab press сразу открывает `AiCreateRequest`.

**ACTION:** `ADAPT`

После navigation reference центральная кнопка должна открывать action sheet и не менять активный tab. Сам `CreateAction` не является обычным tab screen.

---

### NEW ROUTE: `Requests`

**EXISTING:**

- клиентские «Мои заявки»: `mobile/screens/HomeScreen.tsx`, `GET /tasks/mine`;
- доступные заявки мастера: specialist `TasksStack` (`HomeScreen`, `TasksListScreen`, `MapScreen`);
- мои отклики: данные и действия в `TaskDetailScreen`/`TaskApplyScreen`; отдельного списка нет.

**ACTION:** `ADAPT`

Сначала сделать role-aware entry к существующим flows. Новый объединённый Requests UI не создавать в ТЗ №2.

---

### NEW ROUTE: `Profile`

**EXISTING:** `screens/ProfileScreen.tsx` в обеих оболочках; экран уже содержит role-aware sections.

**ACTION:** `ADAPT`

Сохранить backend profile, balance, portfolio, verification и account actions. Визуальное объединение выполнить позже.

---

## AppStack destinations

### NEW ROUTE: `AIRequest`

**EXISTING:** `mobile/screens/AiCreateRequestScreen.tsx`, legacy route `AiCreateRequest`.

**ACTION:** `REUSE`

Центральное действие «Найти мастера» открывает этот существующий RequestDraft flow. Legacy name `AiCreateRequest` остаётся зарегистрированным как alias.

---

### NEW ROUTE: `CreatePlace`

**EXISTING:** mobile flow отсутствует. Portfolio editor в `ProfileScreen` не является Create Place.

**ACTION:** `RESERVE`

Зафиксировать typed route/entry point. Не создавать форму или временную копию до отдельного UI reference.

---

### NEW ROUTE: `PlaceDetail`

**EXISTING:** mobile screen отсутствует; backend endpoint подготовлен в ТЗ №1.

**ACTION:** `RESERVE`

---

### NEW ROUTE: `Search`

**EXISTING:** `TaskSearchScreen` ищет заявки мастера, Place search отсутствует.

**ACTION:** `REPLACE LATER`

Legacy `TaskSearch` сохранить отдельно. Unified Search не реализовывать в ТЗ №2.

---

### NEW ROUTE: `TaskDetail`

**EXISTING:** `screens/TaskDetailScreen.tsx`.

**ACTION:** `REUSE`

Экран уже учитывает customer/specialist permissions и ведёт к applications/chat/profile.

---

### NEW ROUTE: `Applications`

**EXISTING:**

- список откликов заказчика встроен в `TaskDetailScreen`;
- форма отклика мастера: `TaskApplyScreen`;
- отдельного applications list нет.

**ACTION:** `ADAPT`

Сохранить `TaskApply` и встроенный список. Новый самостоятельный экран не создавать.

---

### NEW ROUTE: `ChatList`

**EXISTING:** `screens/ChatsScreen.tsx` → `src/screens/ChatListScreen.tsx`; legacy tab `Chats`.

**ACTION:** `REUSE`

Зарегистрировать также в AppStack, чтобы список оставался доступен без отдельного bottom tab.

---

### NEW ROUTE: `Chat`

**EXISTING:** `screens/ChatDetailScreen.tsx` → `src/screens/ChatScreen.tsx`; legacy route `ChatDetail`.

**ACTION:** `REUSE`

Новый route может быть alias к тому же component. `ChatDetail` нельзя удалять, пока все внутренние вызовы не переведены.

---

### NEW ROUTE: `PublicProfile`

**EXISTING:**

- `SpecialistProfileScreen`;
- `CustomerProfileScreen` в specialist app.

**ACTION:** `ADAPT`

Нужен role-aware adapter по `userId`/`profileType`; legacy names сохранить.

---

### NEW ROUTE: `Favorites`

**EXISTING:** task favorites/filter встроены в `TasksListScreen`; Place favorites screen отсутствует.

**ACTION:** `RESERVE`

---

### NEW ROUTE: `Balance`

**EXISTING:** `WalletScreen`, specialist tab `Wallet`, deep link destination `PaymentReturn`.

**ACTION:** `REUSE`

Legacy `Wallet`/`PaymentReturn` и payment-return deep link сохранить.

---

### NEW ROUTE: `Settings`

**EXISTING:** account settings находятся внутри `ProfileScreen`; отдельного screen нет.

**ACTION:** `ADAPT`

Не выделять новый UI без отдельного ТЗ.

---

## Compatibility routes, которые остаются зарегистрированными

| Legacy route | Existing screen/flow | Причина сохранения |
|---|---|---|
| `AiCreateRequest` | `AiCreateRequestScreen` | текущий central `+` и существующие вызовы |
| `TasksList` | `TasksListScreen` | map/list switch и фильтры |
| `TaskSearch` | `TaskSearchScreen` | поиск заявок мастера |
| `TaskFilter` | `TaskFilterScreen` | фильтры заявок |
| `TaskDetail` | `TaskDetailScreen` | task/application/chat transitions |
| `TaskApply` | `TaskApplyScreen` | отправка отклика |
| `CreateTask` | `CreateTaskScreen` | legacy ручная форма заявки |
| `ChatDetail` | `ChatDetailScreen` | внутренние переходы и старые links |
| `SpecialistProfile` | `SpecialistProfileScreen` | Task/Chat → мастер |
| `CustomerProfile` | `CustomerProfileScreen` | Task/Chat → заказчик |
| `Wallet` | `WalletScreen` | профессиональный баланс |
| `PaymentReturn` | `WalletScreen` | callback оплаты |
| `PhoneChange` | `PhoneChangeScreen` | настройки аккаунта |
| `IdentityVerification` | `IdentityVerificationScreen` | проверка мастера |
| `MyReviews` | `MyReviewsScreen` | отзывы профиля |

`OrdersScreen` сейчас является alias к `HomeScreen` и отдельной бизнес-функции не содержит; новый route для него не нужен.

## Proposed route architecture

```text
RootNavigator
├── AuthStack
│   ├── Welcome
│   ├── PhoneEntry
│   └── Login
└── AppStack
    ├── MainTabs
    │   ├── Home
    │   ├── Map
    │   ├── CreateAction       (button/action, tab не переключается)
    │   ├── Requests
    │   └── Profile
    ├── PlaceDetail            (reserved)
    ├── CreatePlace            (reserved entry)
    ├── Search                 (reserved for unified search)
    ├── AIRequest              → AiCreateRequestScreen
    ├── TaskDetail             → TaskDetailScreen
    ├── Applications          → existing TaskDetail/TaskApply adapters
    ├── ChatList               → ChatListScreen
    ├── Chat                   → ChatScreen
    ├── PublicProfile          → role-aware profile adapter
    ├── Favorites              (reserved)
    ├── Balance                → WalletScreen
    ├── Settings               → current Profile actions
    └── LegacyRoutes
        ├── AiCreateRequest
        ├── TasksList / TaskSearch / TaskFilter
        ├── TaskApply / CreateTask
        ├── ChatDetail
        ├── SpecialistProfile / CustomerProfile
        ├── PaymentReturn
        └── PhoneChange / IdentityVerification / MyReviews
```

## Deep-link compatibility map

| External path | Canonical destination | Compatibility requirement |
|---|---|---|
| `treabo-client://chat/:chatId` | `Chat` | backend client chat push; добавить client prefix |
| `treabo-specialist://chat/:chatId` | `Chat` | backend specialist chat push |
| `treabo://chat/:chatId` | `Chat` | сохранить старый общий scheme |
| `treabo-specialist://balance/:result?` | `PaymentReturn`/`Balance` | сохранить payment callback |
| `*/task/:taskId` | `TaskDetail` | добавить compatibility path до появления task push |
| `*/task/:taskId/applications` | `TaskDetail` | открыть существующий applications section без нового screen |
| `*/specialist/:specialistId` | `SpecialistProfile`/`PublicProfile` | сохранить существующий экран |
| `*/customer/:customerId` | `CustomerProfile`/`PublicProfile` | сохранить существующий экран |

Для client app использовать prefixes `treabo-client://` и `treabo://`; для specialist app — `treabo-specialist://` и `treabo://`. Переименование внутренних routes выполнять через aliases, без разрыва текущих `navigation.navigate(...)`.

## Порядок внедрения после получения navigation reference

1. Ввести новые typed route names и compatibility aliases.
2. Зарегистрировать все уже существующие legacy screens в едином `AppStack`.
3. Добавить пять `MainTabs`, не меняя содержимое существующих screens.
4. Реализовать central `+` как action, который не выбирает tab.
5. Подключить «Найти мастера» к `AiCreateRequestScreen`.
6. Оставить `CreatePlace` typed entry без выдуманного UI.
7. Добавить deep-link prefixes/config и проверить push chat/payment paths.
8. Разрешить обе роли в канонической shell, сохранив permissions на уровне действий.
9. Прогнать TypeScript и navigation regression для customer/specialist flows.

UI shell до получения референса не реализуется.
