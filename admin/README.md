# Proffi Admin

Панель администратора (Vite + React). Токен: заголовок `X-Admin-Token` = `ADMIN_TOKEN` на бэкенде (по умолчанию `admin`).

## Запуск

```bash
cd admin
npm install
npm run dev
```

Откройте http://localhost:5173 — форма входа: логин `admin`, пароль совпадает с токеном (по умолчанию `admin`).

Бэкенд должен слушать порт **8001** (или настройте proxy в `vite.config.js`).

## Сборка

```bash
npm run build
```

Артефакты в `dist/`. Для продакшена задайте `VITE_API_BASE` на URL API и `VITE_ADMIN_TOKEN`.
