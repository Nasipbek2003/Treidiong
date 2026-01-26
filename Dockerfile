# Production Dockerfile
FROM node:18-alpine

WORKDIR /app

# Копируем package files
COPY package*.json ./

# Устанавливаем зависимости
RUN npm ci --only=production

# Копируем все файлы
COPY . .

# Собираем Next.js
RUN npm run build

# Создаем директорию для логов
RUN mkdir -p logs

# Expose порт
EXPOSE 3000

# Запускаем сервер с ботом
CMD ["node", "server.js"]
