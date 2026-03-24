# ============================================
# Centro Diagnóstico Mi Esperanza - Dockerfile
# Multi-stage build para producción optimizada
# ============================================

# ── Stage 1: Build del Frontend ──────────────
FROM node:20-alpine AS frontend-builder

WORKDIR /app/frontend

# Copiar dependencias del frontend
COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci --silent

# Copiar código fuente del frontend y compilar
COPY frontend/ ./
RUN npm run build

# ── Stage 2: Backend de producción ───────────
FROM node:20-alpine AS production

# Metadatos
LABEL maintainer="Centro Diagnóstico Mi Esperanza"
LABEL description="Backend API - Centro Diagnóstico"
LABEL version="11.0"

# Instalar dependencias del sistema necesarias
RUN apk add --no-cache \
    dumb-init \
    curl

# Crear usuario no-root por seguridad
RUN addgroup -g 1001 -S appgroup && \
    adduser -S appuser -u 1001 -G appgroup

WORKDIR /app

# Copiar dependencias del backend
COPY package.json package-lock.json ./
RUN npm ci --only=production --silent && \
    npm cache clean --force

# Copiar código fuente del backend
COPY server.js ./
COPY config/ ./config/
COPY controllers/ ./controllers/
COPY middleware/ ./middleware/
COPY models/ ./models/
COPY routes/ ./routes/
COPY services/ ./services/
COPY scripts/ ./scripts/
COPY public/ ./public/

# Copiar build del frontend desde stage anterior
COPY --from=frontend-builder /app/frontend/build ./frontend/build

# Crear directorios necesarios
RUN mkdir -p uploads/resultados uploads/temp uploads/dicom uploads/worklist uploads/imagenes uploads/equipos && \
    chown -R appuser:appgroup /app

# Cambiar a usuario no-root
USER appuser

# Variables de entorno por defecto
ENV NODE_ENV=production
ENV PORT=5000
ENV HOST=0.0.0.0

# Exponer puerto
EXPOSE 5000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD curl -f http://localhost:5000/api/health || exit 1

# Usar dumb-init para manejo correcto de señales
ENTRYPOINT ["dumb-init", "--"]

# Iniciar servidor
CMD ["node", "server.js"]
