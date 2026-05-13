# Proffi — Expo Go (мобильный клиент)

## Настройка

```bash
cd mobile
cp .env.example .env
# Укажите URL бэкенда без /api, например:
# EXPO_PUBLIC_API_URL=https://proffi.sancan.ru
# Для телефона в той же Wi‑Fi сети, что и ПК с бэкендом:
# EXPO_PUBLIC_API_URL=http://192.168.1.10:8001

npm install
npx expo start
```

Откройте проект в **Expo Go** (QR в терминале).

## Поток авторизации (как на бэкенде)

1. **Зарегистрироваться** — email, роль, имя (опционально) → OTP на почту → экран ввода кода → JWT в SecureStore.
2. **Войти по email** — если email уже подтверждён на сервере → сразу JWT; иначе снова OTP.

При старте приложение читает JWT из SecureStore и вызывает `GET /api/auth/me`.

## CORS

Запросы идут из **React Native `fetch`**, не из браузера — CORS на API для приложения не мешает. Нужен только доступ по сети (HTTPS в проде, LAN IP в dev).
