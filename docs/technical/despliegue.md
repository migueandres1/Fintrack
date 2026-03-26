# Despliegue con Docker

## Requisitos

- Docker Engine 24+
- Docker Compose v2

---

## Servicios definidos

```yaml
# docker-compose.yml
services:
  mysql:
    image: mysql:8.0
    environment:
      MYSQL_ROOT_PASSWORD: root
      MYSQL_DATABASE: fintrack
      MYSQL_USER: fintrack_user
      MYSQL_PASSWORD: secret
    volumes:
      - mysql_data:/var/lib/mysql
      - ./database/schema.sql:/docker-entrypoint-initdb.d/schema.sql
    ports:
      - "3306:3306"

  backend:
    build: ./backend
    environment:
      DB_HOST: mysql
      DB_USER: fintrack_user
      DB_PASSWORD: secret
      DB_NAME: fintrack
      JWT_SECRET: cambiar_en_produccion
      FRONTEND_URL: http://localhost:5173
      ANTHROPIC_API_KEY: ${ANTHROPIC_API_KEY}
    ports:
      - "4000:4000"
    depends_on:
      - mysql

  frontend:
    build: ./frontend
    ports:
      - "5173:80"
    depends_on:
      - backend
```

---

## Levantar todo

```bash
# Primera vez (construye imágenes)
docker-compose up --build

# Inicio rápido (imágenes ya construidas)
docker-compose up

# En segundo plano
docker-compose up -d

# Ver logs
docker-compose logs -f backend
docker-compose logs -f frontend
```

---

## Dockerfiles

### Backend

```dockerfile
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --production
COPY src ./src
EXPOSE 4000
CMD ["node", "src/index.js"]
```

### Frontend

```dockerfile
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
```

El frontend usa un build multi-stage: compila con Node y sirve el resultado con Nginx.

---

## Migraciones en Docker

Para ejecutar una migración después del despliegue inicial:

```bash
docker-compose exec mysql mysql -u fintrack_user -psecret fintrack < database/migrations/008_categories_management.sql
```

O desde el host si MySQL está expuesto en el puerto 3306:

```bash
mysql -h 127.0.0.1 -u fintrack_user -psecret fintrack < database/migrations/008_categories_management.sql
```

---

## Persistencia de datos

El volumen `mysql_data` persiste los datos de MySQL entre reinicios del contenedor. Para resetear completamente:

```bash
docker-compose down -v   # Elimina también los volúmenes
docker-compose up --build
```

> ⚠️ `down -v` elimina todos los datos. Usar solo en desarrollo.

---

## Variables de entorno en producción

Usa un archivo `.env` en la raíz del proyecto (nunca lo subas al repositorio):

```env
# .env (en la raíz, junto a docker-compose.yml)
ANTHROPIC_API_KEY=sk-ant-...
JWT_SECRET=clave_muy_segura_y_larga
```

Docker Compose lo carga automáticamente con `${VARIABLE}`.
