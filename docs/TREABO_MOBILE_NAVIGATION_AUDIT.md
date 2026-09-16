# TREABO 2.0 — аудит существующей mobile navigation

Дата аудита: 16 сентября 2026 года.

## 1. Область аудита

В репозитории находятся две самостоятельные Expo/React Native оболочки:

- `mobile` — приложение клиента, Android package `ru.treabo.client`, Expo scheme `treabo-client`;
- `mobile-specialist` — приложение мастера, Android package `ru.treabo.specialist`, Expo scheme `treabo-specialist`.

Обе оболочки используют React Navigation 7, Expo 54, React Native 0.81 и почти одинаковый набор shared/legacy screens. Массовое объединение исходников на этом этапе не требуется. Новую route architecture следует сначала внедрять в `mobile` как в будущую единую TREABO shell, сохраняя `mobile-specialist` как совместимую оболочку до переноса всех профессиональных сценариев.

## 2. Entry point и провайдеры

Обе оболочки входят через `App.tsx`.

Порядок провайдеров:

1. `AppErrorBoundary`;
2. `GestureHandlerRootView`;
3. `SafeAreaProvider`;
4. `KeyboardRoot`;
5. `DatabaseProvider`;
6. `LangProvider`;
7. `AuthProvider`;
8. `RootNavigator`;
9. `MobileUpdateGate`.

Эту последовательность нельзя ломать: navigation зависит от auth и language, chat использует локальную SQLite-базу, экраны форм и чата зависят от keyboard/safe-area providers.

## 3. Текущая client navigation (`mobile`)

`src/navigation/RootNavigator.tsx` содержит один `NavigationContainer`, `AuthStack`, `AppStack` и `MainTabs`.

### AuthStack

- `Welcome` → `screens/auth/WelcomeAuthScreen.tsx`;
- `PhoneEntry` → `screens/auth/PhoneAuthScreen.tsx`;
- `Login` → `screens/LoginStubScreen.tsx`.

### MainTabs

- `Home` → `screens/HomeScreen.tsx`, фактически список «Мои заявки»;
- `Create` → технический placeholder; tab press сразу открывает `AiCreateRequest`;
- `Chats` → `screens/ChatsScreen.tsx` → `src/screens/ChatListScreen.tsx`;
- `Profile` → `screens/ProfileScreen.tsx`.

### Зарегистрированные AppStack routes

- `MainTabs`;
- `AiCreateRequest`;
- `TaskDetail`;
- `ChatDetail`;
- `SpecialistProfile`;
- `PhoneChange`;
- `MyReviews`.

### Описаны в типах, но не зарегистрированы в AppStack

- `Map`;
- `TasksList`;
- `TaskSearch`;
- `TaskFilter`;
- `TaskApply`;
- `CreateTask`;
- `IdentityVerification`.

Это уже существующий дефект совместимости: например, `ProfileScreen` вызывает `IdentityVerification`, но client navigator не регистрирует этот destination. Файлы экранов присутствуют, поэтому исправление требует регистрации существующих screens, а не их переписывания.

## 4. Текущая specialist navigation (`mobile-specialist`)

Структура аналогична client app, но содержит вложенный `TasksStack`.

### TasksStack внутри Home tab

- `TasksHome` → доступные заявки (`GET /tasks`);
- `Map` → существующая Yandex Map;
- `TasksList`;
- `TaskSearch`;
- `TaskFilter`.

### MainTabs

- `Home` → `TasksStack`;
- `Wallet` → `WalletScreen`;
- `Chats` → существующий chat list;
- `Profile` → профиль мастера.

### AppStack

- `MainTabs`;
- `PaymentReturn`;
- `TaskDetail`;
- `TaskApply`;
- `CreateTask`;
- `ChatDetail`;
- `CustomerProfile`;
- `SpecialistProfile`;
- `PhoneChange`;
- `IdentityVerification`;
- `MyReviews`.

`TaskDetailScreen` уже проверяет роль и поддерживает обе стороны заявки: клиент видит отклики и принимает мастера, специалист видит стоимость/статус отклика и открывает `TaskApply`. Этот экран можно сохранить как shared legacy destination.

## 5. Auth и роли

Auth хранится в `src/context/AuthContext.tsx`, токен — в Expo SecureStore под ключом `proffi_jwt` (на web — localStorage). После запуска выполняется `GET /api/proffi/auth/me`.

Сейчас роли жёстко разделены на уровне приложений:

- client `isAllowedAppUser` принимает только `customer`;
- specialist `isAllowedAppUser` принимает только `specialist`;
- неподходящая роль приводит к удалению токена и выходу.

Следовательно, единая shell не может быть достигнута одним изменением tabs. На этапе внедрения shell нужно разрешить обе роли в каноническом приложении, сохранив backend permissions и условную доступность действий. Backend auth, модель ролей и разрешения менять не требуется.

OAuth/deep-link token извлекается из query-параметра `token` через `Linking.getInitialURL()` и listener события `url`. Этот механизм должен остаться до `NavigationContainer`, чтобы вход продолжал работать.

## 6. API и state

- Единый клиент: `src/api.ts`.
- Основной namespace: `/api/proffi`.
- Root namespace: `/api` через параметр `namespace: "root"`.
- Chat state: Zustand `src/store/chatStore.ts`.
- Specialist balance state: `src/store/accountStore.ts` в `mobile-specialist`.
- Realtime: Laravel Echo/Pusher через `src/services/realtime.ts`.
- Локальный chat cache: SQLite через `DatabaseProvider` и `src/db/database.ts`.

Новая navigation не должна создавать второй API client, второй auth state или отдельную chat store.

## 7. Push notifications и deep links

Обе оболочки регистрируют Expo push token и передают его backend. Notification handler берёт `data.url` и вызывает `Linking.openURL(url)`.

Backend отправляет chat links:

- клиенту: `treabo-client://chat/{chatId}`;
- мастеру: `treabo-specialist://chat/{chatId}`.

Текущая конфигурация:

- client navigator принимает только prefix `treabo://`, хотя `app.json` указывает `treabo-client`;
- client Android manifest содержит старый scheme `treabo`;
- specialist navigator принимает `treabo-specialist://` и `treabo://`;
- specialist Android manifest содержит `treabo-specialist`;
- client linking config описывает только `ChatDetail: chat/:chatId`;
- specialist linking config описывает `ChatDetail` и `PaymentReturn: balance/:result?`.

Это означает, что client chat push link может не открыться в текущей native-сборке. При внедрении shell нужны оба client prefix (`treabo-client://`, `treabo://`) и синхронизация native scheme. Старый `treabo://` нужно сохранить как compatibility prefix.

Push login confirmation обрабатывается по `data.type === "login_confirmation"` до открытия URL. Этот сценарий не зависит от нового tab layout и должен остаться без изменений.

## 8. Экраны, которые можно переиспользовать

- AI Request: `screens/AiCreateRequestScreen.tsx`;
- Yandex Map: `screens/MapScreen.tsx` и `screens/MapScreen.web.tsx`;
- Task list/search/filter/detail/apply/create: существующие `Task*Screen` и `CreateTaskScreen`;
- Chat list/detail: `src/screens/ChatListScreen.tsx`, `src/screens/ChatScreen.tsx` через существующие wrappers;
- профиль участника: `SpecialistProfileScreen`, `CustomerProfileScreen`;
- balance/payment return: `WalletScreen`;
- account utilities: `PhoneChangeScreen`, `IdentityVerificationScreen`, `MyReviewsScreen`;
- текущие role-aware блоки `ProfileScreen` и `TaskDetailScreen`.

## 9. Отсутствующие или неполные destinations

- mobile Place feed отсутствует;
- mobile Place detail отсутствует;
- Create Place flow отсутствует;
- отдельного unified Requests screen нет;
- отдельного Applications list нет, отклики находятся внутри `TaskDetail`/`TaskApply`;
- отдельного Favorites screen нет, task favorites встроены в `TasksList` мастера;
- отдельного Settings screen нет, настройки аккаунта находятся в `ProfileScreen`;
- Place search отсутствует; существующий `TaskSearchScreen` ищет заявки.

Эти отсутствующие экраны нельзя имитировать копиями или demo content. Для них создаются только route contracts с пометкой о будущем UI.

## 10. Зависимости, которые нельзя сломать

- auth gate и восстановление токена;
- role/permission checks на действиях;
- старые route names, используемые существующими screens;
- chat push links и unread badge;
- payment return link мастера;
- Yandex Map native/web implementations;
- SQLite chat cache и realtime subscriptions;
- `MobileUpdateGate`;
- safe areas и keyboard root;
- переходы Task → Application → Chat;
- переходы Chat → public profile;
- переходы Profile → PhoneChange/IdentityVerification/MyReviews.

## 11. Вывод аудита

Безопасный путь — добавить новую логическую shell поверх существующих screens и route names. `AppStack` должен владеть всеми detail/flow destinations, а `MainTabs` — только пятью верхнеуровневыми пунктами `Home / Map / CreateAction / Requests / Profile`. Старые names остаются зарегистрированными как compatibility routes. Слияние client/specialist исходников, Home/Places UI и новый Create Place UI выполняются отдельными этапами после соответствующих референсов.

Baseline до UI-изменений: `npx tsc --noEmit` проходит в `mobile` и `mobile-specialist`.
