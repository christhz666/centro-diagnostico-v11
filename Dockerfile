# ============================================================
# Dockerfile para Centro Diagnóstico Mi Esperanza
# Backend Node.js + Express + MongoDB
# ============================================================

FROM node:18-alpine

# Instalar dependencias del sistema
RUN apk add --no-cache \
    python3 \
    make \
    g++ \
    bash \
    mongodb-tools

# Crear directorio de trabajo
WORKDIR /app

# Copiar package files
COPY package*.json ./

# Instalar dependencias (solo producción)
RUN npm ci --only=production

# Copiar código fuente
COPY . .

# Crear directorios necesarios
RUN mkdir -p logs backups uploads

# Exponer puerto
EXPOSE 5000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:5000/api/health || exit 1

# Comando de inicio
CMD ["node", "server.js"]
