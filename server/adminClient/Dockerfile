FROM node:20-alpine AS builder

WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .

# Переменные для сборки (base URL API подставляется в билд)
ARG VITE_API_BASE
ENV VITE_API_BASE=${VITE_API_BASE}

RUN npm run build

# Стадия продакшена: раздаём только собранную статику
FROM node:20-alpine

WORKDIR /app
RUN npm install -g serve

COPY --from=builder /app/dist ./dist

EXPOSE 5173

# SPA: все неизвестные пути отдаём index.html
CMD ["serve", "-s", "dist", "-l", "5173"]
