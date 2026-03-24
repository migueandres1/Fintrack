# Deploy — FinTrack en Ubuntu 22.04

---

## 1. Conectarse al servidor

```bash
ssh usuario@IP_SERVIDOR
```

---

## 2. Actualizar el sistema

```bash
sudo apt update && sudo apt upgrade -y
```

---

## 3. Instalar MySQL

```bash
sudo apt install mysql-server -y
sudo mysql_secure_installation
```

`mysql_secure_installation` pregunta varias cosas — responde `Y` a todo para una configuración segura.

### Crear la base de datos y el usuario

```bash
sudo mysql -u root -p
```

Dentro de la consola MySQL:

```sql
CREATE DATABASE fintrack CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'fintrack_user'@'localhost' IDENTIFIED BY 'tu_password_seguro';
GRANT ALL PRIVILEGES ON fintrack.* TO 'fintrack_user'@'localhost';
FLUSH PRIVILEGES;
EXIT;
```

### Cargar el schema (más adelante, después de clonar el repo)

```bash
mysql -u fintrack_user -p fintrack < ~/fintrack/database/schema.sql
```

---

## 4. Instalar Docker

```bash
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER
newgrp docker
```

Verificar:

```bash
docker --version
docker compose version
```

---

## 5. Instalar Git y clonar el repositorio

```bash
sudo apt install git -y
cd ~
git clone https://github.com/tu-usuario/fintrack.git
cd fintrack
```

Cargar el schema:

```bash
mysql -u fintrack_user -p fintrack < database/schema.sql
```

---

## 6. Crear el archivo de variables de entorno

```bash
nano ~/fintrack/.env
```

Contenido:

```env
MYSQL_USER=fintrack_user
MYSQL_PASSWORD=tu_password_seguro
DB_NAME=fintrack

JWT_SECRET=pegar_aqui_cadena_larga_aleatoria
JWT_EXPIRES_IN=7d

FRONTEND_URL=https://tu-app.vercel.app
```

Generar el JWT_SECRET:

```bash
openssl rand -hex 64
```

Copiar el resultado y pegarlo en `JWT_SECRET`.

---

## 7. Crear el docker-compose de producción

Solo el backend — MySQL corre directo en el servidor.

```bash
nano ~/fintrack/docker-compose.prod.yml
```

Contenido:

```yaml
services:
  backend:
    build:
      context: ./backend
    restart: unless-stopped
    network_mode: host
    environment:
      PORT:           4000
      DB_HOST:        127.0.0.1
      DB_PORT:        3306
      DB_USER:        ${MYSQL_USER}
      DB_PASSWORD:    ${MYSQL_PASSWORD}
      DB_NAME:        ${DB_NAME}
      JWT_SECRET:     ${JWT_SECRET}
      JWT_EXPIRES_IN: ${JWT_EXPIRES_IN}
      FRONTEND_URL:   ${FRONTEND_URL}
```

> `network_mode: host` permite que el contenedor se conecte al MySQL del servidor en `127.0.0.1`.

---

## 8. Levantar el backend

```bash
cd ~/fintrack
docker compose -f docker-compose.prod.yml up -d --build
```

Verificar que esté corriendo:

```bash
docker compose -f docker-compose.prod.yml ps
docker compose -f docker-compose.prod.yml logs -f backend
```

Probar que responde:

```bash
curl http://localhost:4000/api/health
```

---

## 9. Abrir el firewall

```bash
sudo ufw allow OpenSSH
sudo ufw allow 4000
sudo ufw enable
sudo ufw status
```

---

## 10. Instalar Nginx como proxy con SSL

Nginx recibe en el puerto 443 (HTTPS) y reenvía al backend en el 4000. Necesario para que Vercel pueda hacer el rewrite a tu servidor.

### Instalar Nginx y Certbot

```bash
sudo apt install nginx certbot python3-certbot-nginx -y
```

### Apuntar el dominio al servidor

En tu proveedor de DNS, crea un registro A:

```
api.tudominio.com  →  IP_DEL_SERVIDOR
```

Espera unos minutos a que propague.

### Crear la configuración de Nginx

```bash
sudo nano /etc/nginx/sites-available/fintrack
```

Contenido:

```nginx
server {
    listen 80;
    server_name api.tudominio.com;

    location / {
        proxy_pass         http://localhost:4000;
        proxy_http_version 1.1;
        proxy_set_header   Host              $host;
        proxy_set_header   X-Real-IP         $remote_addr;
        proxy_set_header   X-Forwarded-For   $proxy_add_x_forwarded_for;
        proxy_set_header   X-Forwarded-Proto $scheme;
    }
}
```

Activar y recargar:

```bash
sudo ln -s /etc/nginx/sites-available/fintrack /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

### Obtener el certificado SSL

```bash
sudo certbot --nginx -d api.tudominio.com
```

Certbot modifica la config automáticamente y programa la renovación. El backend queda en `https://api.tudominio.com`.

Actualiza `FRONTEND_URL` en el `.env` con la URL de Vercel y reinicia el backend:

```bash
docker compose -f docker-compose.prod.yml up -d
```

---

## 11. Configurar el frontend en Vercel

Crea `frontend/vercel.json` en el repositorio:

```json
{
  "rewrites": [
    {
      "source": "/api/:path*",
      "destination": "https://api.tudominio.com/api/:path*"
    }
  ]
}
```

Luego en [vercel.com](https://vercel.com):

1. **New Project → Import Git Repository**
2. Selecciona el repo
3. **Root Directory**: `frontend`
4. Framework: **Vite** (se detecta automáticamente)
5. **Deploy**

Cada `git push` a `main` redespliega el frontend automáticamente.

---

## 12. Actualizar en producción

```bash
cd ~/fintrack
git pull
docker compose -f docker-compose.prod.yml up -d --build
```

---

## Comandos útiles del día a día

```bash
# Ver estado del backend
docker compose -f docker-compose.prod.yml ps

# Ver logs en tiempo real
docker compose -f docker-compose.prod.yml logs -f backend

# Reiniciar el backend
docker compose -f docker-compose.prod.yml restart backend

# Consola de MySQL
mysql -u fintrack_user -p fintrack

# Backup de la base de datos
mysqldump -u fintrack_user -p fintrack > backup_$(date +%Y%m%d).sql

# Restaurar backup
mysql -u fintrack_user -p fintrack < backup_20260101.sql
```

---

## Arquitectura final

```
Usuario
  │
  ├─► Vercel  (frontend React/Vite)
  │     └─► /api/*  ──rewrite──►  https://api.tudominio.com
  │
  └─► Servidor Ubuntu 22.04
        ├─► Nginx      (SSL, puerto 443)  →  localhost:4000
        ├─► Docker     (backend Node.js,  puerto 4000)
        └─► MySQL 8.0  (nativo, puerto 3306 local)
```
