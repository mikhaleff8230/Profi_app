# Proffi VPS Deploy (Ubuntu 22.04+)

## 1) Clone project

```bash
sudo mkdir -p /var/www
sudo chown -R $USER:$USER /var/www
cd /var/www
git clone <https://github.com/mikhaleff8230/Profi_app> proffi
cd proffi
```

## 2) Install system packages

```bash
sudo apt update
sudo apt install -y python3 python3-venv python3-pip nodejs npm nginx
```

## 3) Backend setup

```bash
cd /var/www/proffi/backend
cp env.vps.template .env
nano .env
# (подробные комментарии — в .env.example)
python3 -m venv .venv
source .venv/bin/activate
pip install --upgrade pip
pip install -r requirements.txt
deactivate
```

Шаблон для быстрого старта на VPS: `backend/env.vps.template` → `backend/.env`. Расшифровка полей: `backend/.env.example`.

Обязательно проверьте:
- `APP_ENV=production`
- `DATABASE_URL=sqlite+aiosqlite:////var/www/proffi/backend/app.db` (или не задавайте — тогда `app.db` рядом с `db.py`)
- `JWT_SECRET`, `ADMIN_TOKEN` — длинные случайные строки
- `CORS_ORIGINS` — ваши `https://...` фронта и админки

База: **SQLite** (`app.db`), таблицы создаются при старте. Бэкап — копия файла `app.db`.

## 4) Frontend setup

```bash
cd /var/www/proffi/frontend
cp env.vps.template .env
nano .env
npm ci
npm run build
```

Шаблон: `frontend/env.vps.template` (в `.env` нужен **`REACT_APP_API_URL`** — origin фронта, **без** суффикса `/api`; запросы пойдут на `…/api` через Nginx). Подробнее — `frontend/.env.example`.

## 4.0) Expo Go (мобильное приложение)

Каталог **`mobile/`** (не `backend/`): React Native + Expo, вход по **email + OTP** и JWT в **SecureStore**. См. **`mobile/README.md`**. Переменная **`EXPO_PUBLIC_API_URL`** — origin API **без** `/api`. Из корня репозитория: **`npm run mobile:start`** (или `cd mobile` и `npx expo start`).

## 4.1) Admin (Vite), если собираете отдельно

```bash
cd /var/www/proffi/admin
cp env.vps.template .env
nano .env
npm ci
npm run build
```

Нужен **`VITE_API_BASE`** только если админка **не** на поддомене `admin.*`. Если URL вида `https://admin.proffi.sancan.ru`, сборка сама подставит API на `https://proffi.sancan.ru` (см. `admin/src/services/api.js`). Иначе задайте origin основного сайта с Nginx `/api/`, без `/api` в конце.

Не задавайте в `.env` продакшена **`VITE_ADMIN_TOKEN`** с реальным секретом: значения `VITE_*` попадают в собранный JS. Токен из `ADMIN_TOKEN` бэкенда вводите на экране входа в админке. Шаблон: `admin/env.vps.template`, комментарии — `admin/.env.example`.

## 5) systemd service (backend)

```bash
sudo cp /var/www/proffi/deploy/systemd/proffi-backend.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable proffi-backend
sudo systemctl start proffi-backend
sudo systemctl status proffi-backend --no-pager
```

Logs:

```bash
sudo journalctl -u proffi-backend -f
```

## 6) Nginx config

```bash
sudo cp /var/www/proffi/deploy/nginx/proffi.conf /etc/nginx/sites-available/proffi
# При необходимости отредактируйте server_name в файле (без плейсхолдеров вроде <VPS_IP>).
sudo ln -sf /etc/nginx/sites-available/proffi /etc/nginx/sites-enabled/proffi
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t
sudo systemctl restart nginx
```

## 7) Open firewall

```bash
sudo ufw allow OpenSSH
sudo ufw allow 'Nginx Full'
sudo ufw --force enable
sudo ufw status
```

## 8) Verification

Browser checks:
- `http://<your-vps-ip>/health`
- `http://<your-vps-ip>/api/`
- `http://<your-vps-ip>/`

Phone checks (same network or public internet):
- Open `http://<your-vps-ip>/` in mobile browser
- API test: `http://<your-vps-ip>/health`

### Git на сервере (актуальность кода)

```bash
cd /var/www/proffi
git status
git log -1 --oneline
git rev-parse HEAD
# Сравните с последним коммитом на GitHub.
```

### Сервис и API

```bash
sudo systemctl is-active proffi-backend
curl -sS http://127.0.0.1:8001/health
curl -sS -o /dev/null -w "%{http_code}\n" http://127.0.0.1:8001/api/
```

### База SQLite

Файл по умолчанию: `backend/app.db` (или путь из `DATABASE_URL`).

```bash
ls -la /var/www/proffi/backend/app.db
# при установленном sqlite3:
sqlite3 /var/www/proffi/backend/app.db "SELECT phone, role, name FROM users LIMIT 20;"
```

### Пользователи для входа в приложение (телефон + пароль)

1. **Полный seed** (`POST /api/admin/seed` с заголовком `X-Admin-Token: <ADMIN_TOKEN>` или CLI `python -m seed` в каталоге backend) создаёт из `seed.py`:
   - админ: **`+10000000001`** / **`admin123`**
   - заказчик: **`+10000000002`** / **`customer123`**
   - специалист: **`+10000000003`** / **`specialist123`**

2. Если в `.env` бэкенда **`ENABLE_TEST_SEED=true`**, при старте создаётся тестовый пользователь: **`+79031416581`** / **`Test12345!`** (роль в БД — customer).

Пока таблица `users` пуста, логин в приложении вернёт 401 — сначала выполните seed или включите `ENABLE_TEST_SEED`, перезапустите сервис.

### Временный автологин на проде (фронт)

В `frontend/.env` перед сборкой можно задать **`REACT_APP_AUTOLOGIN=true`**: тогда сборка будет сама логиниться (по умолчанию под seed-админом `+10000000001` / `admin123`, если не заданы `REACT_APP_AUTOLOGIN_PHONE` / `REACT_APP_AUTOLOGIN_PASSWORD`). **Небезопасно** — отключите, когда авторизация будет готова. Подробнее — комментарии в `frontend/.env.example`.

## 9) Update deployment after new commit

```bash
cd /var/www/proffi
git pull

cd /var/www/proffi/backend
source .venv/bin/activate
pip install -r requirements.txt
deactivate
sudo systemctl restart proffi-backend

cd /var/www/proffi/frontend
npm ci
npm run build
sudo systemctl reload nginx
```
