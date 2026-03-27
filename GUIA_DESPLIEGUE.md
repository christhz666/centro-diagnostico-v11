# 🚀 Guía de Despliegue - Centro Diagnóstico Mi Esperanza v11

Esta guía presenta dos métodos de despliegue: tradicional y con Docker.

---

## 📋 Requisitos Previos

### Método Tradicional
- Node.js 18+
- MongoDB 6+
- npm o yarn
- 2GB RAM mínimo
- 20GB almacenamiento

### Método Docker
- Docker 20+
- Docker Compose 2+
- 2GB RAM mínimo
- 20GB almacenamiento

---

## 🔧 Método 1: Despliegue Tradicional

### Paso 1: Clonar el repositorio
```bash
git clone <url-del-repo> centro-diagnostico
cd centro-diagnostico
```

### Paso 2: Configurar variables de entorno
```bash
cp .env.example .env
nano .env  # Editar con tus valores reales
```

**Variables críticas a cambiar:**
- `JWT_SECRET`: Generar uno seguro (`openssl rand -hex 32`)
- `MONGODB_URI`: URI de conexión a MongoDB
- `EMAIL_PASS`: Contraseña de email
- `CORS_ORIGINS`: URL de tu dominio

### Paso 3: Instalar dependencias
```bash
npm install --production
```

### Paso 4: Instalar y configurar MongoDB
```bash
# Ubuntu/Debian
sudo apt update
sudo apt install -y mongodb
sudo systemctl start mongodb
sudo systemctl enable mongodb

# Verificar estado
sudo systemctl status mongodb
```

### Paso 5: Crear usuario administrador
```bash
node createAdmin.js
```

### Paso 6: Iniciar el servidor
```bash
# Producción
npm start

# O con PM2 (recomendado)
npm install -g pm2
pm2 start server.js --name centro-diagnostico
pm2 save
pm2 startup
```

### Paso 7: Configurar Nginx (opcional pero recomendado)
```nginx
server {
    listen 80;
    server_name miesperanzalab.duckdns.org;

    location / {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

### Paso 8: Configurar SSL con Let's Encrypt
```bash
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d miesperanzalab.duckdns.org
```

---

## 🐳 Método 2: Despliegue con Docker (Recomendado)

### Paso 1: Clonar el repositorio
```bash
git clone <url-del-repo> centro-diagnostico
cd centro-diagnostico
```

### Paso 2: Configurar variables de entorno
```bash
cp .env.example .env
nano .env
```

### Paso 3: Construir y levantar contenedores
```bash
# Construir imágenes
docker-compose build

# Levantar servicios
docker-compose up -d

# Ver logs
docker-compose logs -f
```

### Paso 4: Verificar servicios
```bash
# Estado de contenedores
docker-compose ps

# Probar API
curl http://localhost:5000/api/health
```

### Paso 5: Crear usuario administrador
```bash
docker-compose exec backend node createAdmin.js
```

### Comandos útiles de Docker
```bash
# Detener servicios
docker-compose down

# Reiniciar servicios
docker-compose restart

# Ver logs en tiempo real
docker-compose logs -f backend

# Acceder al contenedor
docker-compose exec backend sh

# Backup manual
docker-compose exec backend npm run backup

# Escalar (si usas múltiples instancias)
docker-compose up -d --scale backend=3
```

---

## 💾 Backups Automáticos

### Método Tradicional (cron)
```bash
# Editar crontab
crontab -e

# Añadir backup diario a las 3 AM
0 3 * * * cd /path/to/centro-diagnostico && node scripts/backup-mongodb.js
```

### Método Docker
El servicio `backup` en docker-compose.yml realiza backups automáticos cada 24 horas (configurable con `BACKUP_INTERVAL`).

### Restaurar backup
```bash
# Descomprimir
tar -xzf backup_YYYYMMDD_HHMMSS.tar.gz

# Restaurar con mongorestore
mongorestore --uri="mongodb://localhost:27017/centro_diagnostico" dump_YYYYMMDD_HHMMSS/centro_diagnostico
```

---

## 📊 Monitoreo

### Logs
```bash
# Tradicional
tail -f logs/server_$(date +%Y-%m-%d).log

# Docker
docker-compose logs -f backend
```

### Health Check
```bash
curl http://localhost:5000/api/health
```

### Métricas MongoDB
```bash
mongosh
> db.serverStatus()
> db.currentOp()
```

---

## 🔒 Seguridad Post-Despliegue

### 1. Firewall
```bash
# Ubuntu UFW
sudo ufw allow 22/tcp    # SSH
sudo ufw allow 80/tcp    # HTTP
sudo ufw allow 443/tcp   # HTTPS
sudo ufw enable
```

### 2. Fail2ban
```bash
sudo apt install fail2ban
sudo systemctl enable fail2ban
sudo systemctl start fail2ban
```

### 3. Actualizaciones automáticas
```bash
# Ubuntu
sudo apt install unattended-upgrades
sudo dpkg-reconfigure --priority=low unattended-upgrades
```

### 4. Backup de .env
```bash
# Guardar en lugar seguro (NO en el repo)
cp .env /secure/location/.env.backup
```

---

## 🆘 Troubleshooting

### El servidor no inicia
```bash
# Ver logs
npm start 2>&1 | tee error.log

# Verificar puertos
lsof -i :5000
netstat -tulpn | grep 5000
```

### MongoDB no conecta
```bash
# Verificar servicio
sudo systemctl status mongod

# Ver logs MongoDB
tail -f /var/log/mongodb/mongod.log

# Probar conexión
mongosh mongodb://localhost:27017/centro_diagnostico
```

### Docker no levanta
```bash
# Ver logs detallados
docker-compose logs

# Reconstruir desde cero
docker-compose down -v
docker-compose build --no-cache
docker-compose up -d
```

### Errores de permisos
```bash
# Corregir permisos
sudo chown -R $USER:$USER /path/to/centro-diagnostico
chmod -R 755 /path/to/centro-diagnostico
```

---

## 📞 Soporte

- Email: chrisebay.3009@gmail.com
- Documentación completa: README_CHRIS.md
- Mejoras implementadas: MEJORAS_IMPLEMENTADAS.md

---

*Última actualización: Marzo 2025*
