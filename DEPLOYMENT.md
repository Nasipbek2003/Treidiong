# 🚀 Deployment Guide - Production

## 📋 Варианты деплоя

### 1. Простой запуск (Node.js)
### 2. PM2 (рекомендуется)
### 3. Docker
### 4. Systemd (Linux)
### 5. Vercel/Railway/Render

---

## 1️⃣ Простой запуск

### Локально (разработка)

```bash
# Терминал 1: Next.js
npm run dev

# Терминал 2: Telegram Bot
npm run bot
```

### Production (один процесс)

```bash
# Собрать проект
npm run build

# Запустить сервер + бот
npm run server
```

Это запустит:
- ✅ Next.js на порту 3000
- ✅ Telegram бот в фоне

---

## 2️⃣ PM2 (рекомендуется для VPS)

### Установка PM2

```bash
npm install -g pm2
```

### Запуск

```bash
# Собрать проект
npm run build

# Запустить через PM2
npm run pm2:start
```

### Управление

```bash
# Статус
pm2 status

# Логи
npm run pm2:logs

# Перезапуск
npm run pm2:restart

# Остановка
npm run pm2:stop

# Удалить из PM2
pm2 delete all
```

### Автозапуск при перезагрузке сервера

```bash
# Сохранить текущие процессы
pm2 save

# Настроить автозапуск
pm2 startup
# Выполни команду которую покажет PM2
```

### Логи

```bash
# Все логи
pm2 logs

# Только веб-сервер
pm2 logs trading-signals-web

# Только бот
pm2 logs telegram-bot

# Файлы логов
ls -la logs/
```

---

## 3️⃣ Docker

### Сборка

```bash
npm run docker:build
```

### Запуск

```bash
npm run docker:up
```

### Остановка

```bash
npm run docker:down
```

### Логи

```bash
npm run docker:logs
```

### Переменные окружения

Создай `.env.production`:

```env
TELEGRAM_BOT_TOKEN=твой_токен
TELEGRAM_CHAT_ID=твой_chat_id
ANTHROPIC_API_KEY=твой_ключ
```

Затем:

```bash
docker-compose --env-file .env.production up -d
```

---

## 4️⃣ Systemd (Linux VPS)

### Установка

```bash
# 1. Скопируй файлы на сервер
scp -r . user@server:/var/www/trading-signals

# 2. Установи зависимости
cd /var/www/trading-signals
npm ci --only=production
npm run build

# 3. Создай директорию для логов
sudo mkdir -p /var/log/trading-signals
sudo chown www-data:www-data /var/log/trading-signals

# 4. Скопируй service файл
sudo cp trading-signals.service /etc/systemd/system/

# 5. Обнови переменные окружения в service файле
sudo nano /etc/systemd/system/trading-signals.service

# 6. Перезагрузи systemd
sudo systemctl daemon-reload

# 7. Запусти сервис
sudo systemctl start trading-signals

# 8. Включи автозапуск
sudo systemctl enable trading-signals
```

### Управление

```bash
# Статус
sudo systemctl status trading-signals

# Логи
sudo journalctl -u trading-signals -f

# Перезапуск
sudo systemctl restart trading-signals

# Остановка
sudo systemctl stop trading-signals
```

---

## 5️⃣ Vercel / Railway / Render

### Vercel (только веб, без бота)

```bash
# Установи Vercel CLI
npm i -g vercel

# Деплой
vercel --prod
```

⚠️ **Важно:** Vercel не поддерживает long-running процессы (бот не будет работать).

### Railway (рекомендуется)

1. Создай проект на [railway.app](https://railway.app)
2. Подключи GitHub репозиторий
3. Добавь переменные окружения:
   - `TELEGRAM_BOT_TOKEN`
   - `TELEGRAM_CHAT_ID`
   - `ANTHROPIC_API_KEY`
4. Railway автоматически запустит `npm start`

### Render

1. Создай Web Service на [render.com](https://render.com)
2. Подключи репозиторий
3. Настройки:
   - Build Command: `npm install && npm run build`
   - Start Command: `node server.js`
4. Добавь переменные окружения

---

## 🔧 Настройка переменных окружения

### Production

Создай `.env.production`:

```env
NODE_ENV=production
TELEGRAM_BOT_TOKEN=8447919474:AAGNiBKj9HXJpzBvNLxOE14iR4mojVjva6w
TELEGRAM_CHAT_ID=6254307002
ANTHROPIC_API_KEY=твой_ключ
```

### Загрузка переменных

```bash
# Через dotenv
npm install dotenv

# В server.js
require('dotenv').config({ path: '.env.production' });
```

---

## 📊 Мониторинг

### Health Check

```bash
# Проверка веб-сервера
curl http://localhost:3000/api/signals/monitor

# Проверка бота (отправь /help в Telegram)
```

### Логи

```bash
# PM2
pm2 logs

# Docker
docker-compose logs -f

# Systemd
sudo journalctl -u trading-signals -f

# Файлы
tail -f logs/bot-out.log
tail -f logs/web-out.log
```

---

## 🔒 Безопасность

### 1. Защита переменных окружения

```bash
# Не коммить .env файлы
echo ".env*" >> .gitignore
echo "!.env.example" >> .gitignore
```

### 2. Firewall

```bash
# Открыть только нужные порты
sudo ufw allow 3000/tcp
sudo ufw allow 22/tcp
sudo ufw enable
```

### 3. Nginx reverse proxy

```nginx
server {
    listen 80;
    server_name yourdomain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

### 4. SSL (Let's Encrypt)

```bash
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d yourdomain.com
```

---

## 🎯 Рекомендации

### Для VPS (DigitalOcean, Linode, etc.)
✅ **PM2** - лучший выбор

### Для контейнеров
✅ **Docker** - изоляция и портативность

### Для облачных платформ
✅ **Railway/Render** - простота деплоя

### Для простого тестирования
✅ **npm run server** - быстрый старт

---

## 🆘 Troubleshooting

### Бот не отвечает

```bash
# Проверь процесс
pm2 status telegram-bot

# Проверь логи
pm2 logs telegram-bot

# Перезапусти
pm2 restart telegram-bot
```

### Веб-сервер не запускается

```bash
# Проверь порт
lsof -i :3000

# Убей процесс
kill -9 $(lsof -t -i:3000)

# Перезапусти
pm2 restart trading-signals-web
```

### Нет уведомлений

```bash
# Проверь переменные окружения
pm2 env telegram-bot

# Проверь Telegram токен
curl https://api.telegram.org/bot<TOKEN>/getMe
```

---

## ✅ Checklist перед деплоем

- [ ] Собрать проект: `npm run build`
- [ ] Проверить переменные окружения
- [ ] Протестировать локально: `npm run server`
- [ ] Настроить автозапуск (PM2/systemd)
- [ ] Настроить логирование
- [ ] Настроить мониторинг
- [ ] Настроить backup
- [ ] Настроить SSL (если нужен HTTPS)
- [ ] Проверить firewall
- [ ] Протестировать бота в Telegram

---

**Готово! Система работает в production!** 🎉
