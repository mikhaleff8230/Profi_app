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
cp .env.example .env
nano .env
python3 -m venv .venv
source .venv/bin/activate
pip install --upgrade pip
pip install -r requirements.txt
deactivate
```

Required `.env` values:
- `APP_ENV=production`
- `MONGO_URL=<MongoDB Atlas URI>`
- `DB_NAME=<db_name>`
- `JWT_SECRET=<strong_random_secret>`
- `CORS_ORIGINS=https://<your-domain>,http://<your-vps-ip>`

## 4) Frontend setup

```bash
cd /var/www/proffi/frontend
cp .env.example .env
nano .env
npm ci
npm run build
```

Required frontend `.env` value:
- `REACT_APP_API_URL=http://<your-vps-ip>` or `https://<your-domain>`

## 5) systemd service (backend)

Для **Atlas** (`mongodb+srv`) в **`server.py`** заданы **`tls=True`** и **`tlsAllowInvalidCertificates=True`** в Motor — иначе на OpenSSL 3 на части VPS handshake падает с `TLSV1_ALERT_INTERNAL_ERROR`. Дополнительно unit может задавать **`OPENSSL_CONF`** → `deploy/ssl/openssl-mongodb.cnf` (необязательно, если код уже обходит проблему).

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
