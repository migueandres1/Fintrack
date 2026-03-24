# Deploy — FinTrack en Ubuntu 22.04

Todo nativo, sin Docker. MySQL, Node.js y Nginx corren directamente en el servidor.

```
Navegador  →  http://IP_SERVIDOR
                └─► Nginx :80  (sirve el build de React + proxy /api/)
                      └─► /api/*  ──proxy──►  Node.js/pm2 :4000
                                                    └─► MySQL :3306
```

---

## 1. Actualizar el sistema

```bash
sudo apt update && sudo apt upgrade -y
```

---

## 2. Instalar MySQL

```bash
sudo apt install mysql-server -y
sudo mysql_secure_installation
```

Crear la base de datos y el usuario:

```bash
sudo mysql -u root -p
```

```sql
CREATE DATABASE fintrack CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'fintrack_user'@'localhost' IDENTIFIED BY 'TuPassword';
GRANT ALL PRIVILEGES ON fintrack.* TO 'fintrack_user'@'localhost';
FLUSH PRIVILEGES;
EXIT;
```

---

## 3. Instalar Node.js 20

```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install nodejs -y
node --version
```

---

## 4. Instalar Git y clonar el proyecto

```bash
sudo apt install git -y
cd ~
git clone https://github.com/tu-usuario/fintrack.git
cd fintrack
```

---

## 5. Crear el .env del backend

```bash
cp ~/fintrack/backend/.env.example ~/fintrack/backend/.env
nano ~/fintrack/backend/.env
```

```env
PORT=4000
NODE_ENV=production

DB_HOST=localhost
DB_PORT=3306
DB_USER=fintrack_user
DB_PASSWORD=TuPassword
DB_NAME=fintrack

JWT_SECRET=PEGAR_AQUI_CADENA_GENERADA
JWT_EXPIRES_IN=7d

FRONTEND_URL=http://IP_DEL_SERVIDOR
```

Generar el JWT_SECRET:

```bash
openssl rand -hex 64
```

---

## 6. Cargar el schema

```bash
mysql -u fintrack_user -p'TuPassword' fintrack < ~/fintrack/database/schema.sql
```

---

## 7. Instalar dependencias del backend y levantar con pm2

```bash
cd ~/fintrack/backend
npm install --production
```

Instalar pm2 globalmente:

```bash
sudo npm install -g pm2
```

Levantar el backend:

```bash
pm2 start src/index.js --name fintrack-api
pm2 save
pm2 startup
# Ejecuta el comando que imprima pm2 startup
```

Verificar:

```bash
pm2 status
pm2 logs fintrack-api --lines 20
```

---

## 8. Buildear el frontend

```bash
cd ~/fintrack/frontend
npm install
npm run build
```

Genera la carpeta `dist/` con los archivos estáticos.

---

## 9. Instalar Nginx y servir el frontend

```bash
sudo apt install nginx -y
```

Crear la configuración:

```bash
sudo nano /etc/nginx/sites-available/fintrack
```

```nginx
server {
    listen 80;

    root /home/TU_USUARIO/fintrack/frontend/dist;
    index index.html;

    location /api/ {
        proxy_pass http://localhost:4000/api/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }

    location / {
        try_files $uri $uri/ /index.html;
    }
}
```

> Reemplaza `TU_USUARIO` con el nombre de tu usuario en el servidor (`echo $USER`).

Activar y recargar:

```bash
sudo rm /etc/nginx/sites-enabled/default
sudo ln -s /etc/nginx/sites-available/fintrack /etc/nginx/sites-enabled/fintrack
sudo nginx -t
sudo systemctl reload nginx
```

Dar permisos de lectura a Nginx:

```bash
chmod 755 /home/TU_USUARIO
chmod -R 755 ~/fintrack/frontend/dist
```

---

## 10. Firewall

```bash
sudo ufw allow OpenSSH
sudo ufw allow 80
sudo ufw enable
```

---

Abrir en el navegador: `http://IP_DEL_SERVIDOR`

---

## Actualizar en producción

```bash
cd ~/fintrack
git pull

# Rebuild frontend
cd frontend
npm install
npm run build
chmod -R 755 ~/fintrack/frontend/dist

# Reiniciar backend
cd ../backend
npm install --production
pm2 restart fintrack-api
```

---

## Comandos útiles

```bash
# Estado del backend
pm2 status

# Logs en tiempo real
pm2 logs fintrack-api

# Reiniciar backend
pm2 restart fintrack-api

# Consola MySQL
mysql -u fintrack_user -p fintrack

# Backup
mysqldump -u fintrack_user -p'TuPassword' fintrack > backup_$(date +%Y%m%d).sql

# Restaurar backup
mysql -u fintrack_user -p'TuPassword' fintrack < backup_20260101.sql
```

---

> Cuando tengas dominio: instala Certbot, agrega `server_name tudominio.com` en el nginx config
> y ejecuta `sudo certbot --nginx -d tudominio.com`. Actualiza `FRONTEND_URL` en el `.env` y reinicia pm2.
