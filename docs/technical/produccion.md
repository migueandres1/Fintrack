# Producción en servidor Ubuntu

Guía para desplegar FinTrack en un servidor Ubuntu 22.04 sin Docker, usando Node.js nativo, MySQL y Nginx.

---

## Requisitos previos

```bash
# Actualizar sistema
sudo apt update && sudo apt upgrade -y

# Instalar Node.js 20 (via NodeSource)
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Instalar MySQL 8.0
sudo apt install -y mysql-server
sudo mysql_secure_installation

# Instalar Nginx
sudo apt install -y nginx

# Instalar PM2 (gestor de procesos para Node.js)
sudo npm install -g pm2
```

---

## Configurar MySQL

```bash
# Acceder a MySQL como root
sudo mysql

# Dentro de MySQL:
CREATE DATABASE fintrack CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'fintrack_user'@'localhost' IDENTIFIED BY 'contraseña_segura';
GRANT ALL PRIVILEGES ON fintrack.* TO 'fintrack_user'@'localhost';
FLUSH PRIVILEGES;
EXIT;

# Importar el esquema
mysql -u fintrack_user -p fintrack < /var/www/fintrack/database/schema.sql
```

---

## Configurar el Backend

```bash
# Copiar archivos
sudo mkdir -p /var/www/fintrack/backend
cd /var/www/fintrack/backend

# Instalar dependencias
npm ci --production

# Crear archivo de entorno
sudo nano .env
```

Contenido del `.env`:

```env
PORT=4000
DB_HOST=localhost
DB_PORT=3306
DB_USER=fintrack_user
DB_PASSWORD=contraseña_segura
DB_NAME=fintrack
JWT_SECRET=clave_muy_larga_y_aleatoria_aqui
JWT_EXPIRES_IN=7d
FRONTEND_URL=https://tudominio.com
ANTHROPIC_API_KEY=sk-ant-...
```

```bash
# Iniciar con PM2
pm2 start src/index.js --name fintrack-backend
pm2 save
pm2 startup  # Genera el comando para auto-inicio en boot
```

---

## Construir el Frontend

```bash
cd /var/www/fintrack/frontend

# Crear .env de producción
echo "VITE_API_URL=https://tudominio.com/api" > .env.production

# Instalar y compilar
npm ci
npm run build

# Los archivos estáticos quedan en dist/
```

---

## Configurar Nginx

```nginx
# /etc/nginx/sites-available/fintrack
server {
    listen 80;
    server_name tudominio.com www.tudominio.com;

    # Frontend (archivos estáticos)
    root /var/www/fintrack/frontend/dist;
    index index.html;

    # SPA: todas las rutas van a index.html
    location / {
        try_files $uri $uri/ /index.html;
    }

    # Proxy al backend
    location /api/ {
        proxy_pass http://127.0.0.1:4000/api/;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }

    # Health check
    location /health {
        proxy_pass http://127.0.0.1:4000/health;
    }
}
```

```bash
# Activar el sitio
sudo ln -s /etc/nginx/sites-available/fintrack /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

---

## HTTPS con Certbot (Let's Encrypt)

```bash
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d tudominio.com -d www.tudominio.com
# Certbot modifica nginx.conf automáticamente para HTTPS
sudo systemctl reload nginx
```

---

## Gestión con PM2

```bash
# Ver estado
pm2 status

# Ver logs
pm2 logs fintrack-backend

# Reiniciar
pm2 restart fintrack-backend

# Actualización sin downtime
pm2 reload fintrack-backend
```

---

## Aplicar migraciones en producción

```bash
mysql -u fintrack_user -p fintrack < /var/www/fintrack/database/migrations/008_categories_management.sql
mysql -u fintrack_user -p fintrack < /var/www/fintrack/database/migrations/009_budget_planned_income.sql
```

---

## Backups

```bash
# Backup diario de la base de datos
mysqldump -u fintrack_user -p fintrack > /backups/fintrack_$(date +%Y%m%d).sql

# Automatizar con cron
crontab -e
# Agregar:
0 2 * * * mysqldump -u fintrack_user -pcontraseña fintrack > /backups/fintrack_$(date +\%Y\%m\%d).sql
```
