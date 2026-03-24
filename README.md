# 🏥 Centro Diagnóstico Mi Esperanza

Sistema completo de gestión para centro diagnóstico médico con backend API, frontend React y aplicación de escritorio Tauri.

---

## 🛠️ Stack Tecnológico

| Componente | Tecnología |
|---|---|
| **Backend** | Node.js + Express.js |
| **Base de datos** | MongoDB (Mongoose ODM) |
| **Frontend** | React + Tailwind CSS |
| **Desktop** | Tauri (Rust) |
| **Proxy** | Nginx |
| **Email** | Nodemailer |
| **WhatsApp** | Twilio API |
| **Imágenes médicas** | Orthanc (DICOM) |
| **Códigos de barras** | bwip-js |

---

## 📋 Requisitos Previos

- **Node.js** ≥ 18.x
- **MongoDB** ≥ 7.x
- **npm** ≥ 9.x
- (Opcional) **Docker** + **Docker Compose** para deployment containerizado
- (Opcional) **Rust** para compilar la app de escritorio Tauri

---

## 🚀 Instalación

### 1. Clonar el repositorio
```bash
git clone https://github.com/christhz666/centro-diagnostico-v11.git
cd centro-diagnostico-v11
```

### 2. Instalar dependencias del backend
```bash
npm install
```

### 3. Instalar dependencias del frontend
```bash
cd frontend && npm install && cd ..
```

### 4. Configurar variables de entorno
```bash
cp .env.example .env
# Editar .env con tus valores reales
```

### 5. Iniciar en modo desarrollo
```bash
# Backend (puerto 5000)
npm run dev

# Frontend (puerto 3000) — en otra terminal
cd frontend && npm start
```

---

## 🐳 Deployment con Docker

```bash
# Construir e iniciar todos los servicios
docker compose up -d

# Ver logs
docker compose logs -f api

# Detener
docker compose down
```

---

## 📦 Scripts Disponibles

| Comando | Descripción |
|---|---|
| `npm start` | Iniciar servidor en producción |
| `npm run dev` | Iniciar con nodemon (desarrollo) |
| `npm test` | Ejecutar tests con Jest |
| `npm run seed` | Poblar base de datos con datos iniciales |
| `npm run frontend:build` | Compilar el frontend React |
| `npm run tauri:dev` | Iniciar app de escritorio Tauri |
| `npm run tauri:build` | Compilar app de escritorio |
| `npm run build:backend` | Compilar backend como ejecutable (pkg) |

---

## 🗄️ Modelos de Datos

| Modelo | Descripción |
|---|---|
| `User` | Usuarios del sistema (admin, médico, recepción, lab) |
| `Paciente` | Pacientes registrados |
| `Cita` | Citas y órdenes de trabajo |
| `Estudio` | Catálogo de estudios médicos |
| `Resultado` | Resultados de estudios |
| `Factura` | Facturación (NCF, ITBIS) |
| `Sucursal` | Sucursales del centro |
| `Equipo` | Equipos médicos conectados |
| `TurnoCaja` | Turnos y movimientos de caja |
| `MovimientoContable` | Contabilidad |
| `PoolBarcode` | Pool de códigos de barras |
| `AuditLog` | Registro de auditoría |
| `Configuracion` | Ajustes del sistema |

---

## 🔌 API Endpoints

| Ruta | Descripción |
|---|---|
| `GET /api/health` | Health check |
| `POST /api/auth/login` | Inicio de sesión |
| `GET /api/pacientes` | Listar pacientes |
| `GET /api/citas` | Listar citas |
| `GET /api/estudios` | Catálogo de estudios |
| `GET /api/resultados` | Resultados médicos |
| `GET /api/facturas` | Facturación |
| `GET /api/dashboard` | Panel de control |
| `GET /api/caja` | Turnos de caja |
| `GET /api/contabilidad` | Contabilidad |
| `GET /api/equipos` | Equipos médicos |
| `GET /api/imagenologia` | Imagenología DICOM |
| `GET /api/auditoria` | Logs de auditoría |
| `GET /api/sucursales` | Sucursales |
| `POST /api/whatsapp` | Envío de WhatsApp |

> Todas las rutas (excepto `/api/auth/login` y `/api/health`) requieren token JWT en header `Authorization: Bearer <token>`.

---

## 🏗️ Estructura del Proyecto

```
centro-diagnostico-v11/
├── config/           # Configuración de BD y servicios
├── controllers/      # Lógica de negocio
├── frontend/         # React + Tailwind + Tauri
│   ├── src/          # Código fuente React
│   ├── src-tauri/    # Configuración Tauri (desktop)
│   └── build/        # Build de producción
├── middleware/        # Auth, validación, errores, sucursal
├── models/           # Schemas Mongoose (13 modelos)
├── routes/           # Endpoints de la API
├── services/         # Servicios (equipos, Orthanc)
├── scripts/          # Scripts de utilidad
├── tests/            # Tests Jest
├── public/           # Archivos estáticos
├── nginx/            # Configuración Nginx
├── .github/          # GitHub Actions CI/CD
├── server.js         # Punto de entrada del servidor
├── package.json      # Dependencias Node.js
├── Dockerfile        # Imagen Docker
├── docker-compose.yml # Orquestación de servicios
└── .env.example      # Template de variables de entorno
```

---

## 🔒 Seguridad

- **Helmet** con Content Security Policy configurada
- **Rate limiting** en API general y login
- **JWT** para autenticación
- **bcryptjs** para hash de contraseñas
- **express-validator** para validación de entradas
- **CORS** configurado por dominio
- **Auditoría** de acciones del sistema

---

## 🩺 Integración DICOM

El sistema soporta integración con equipos de imagenología médica vía:

1. **Orthanc** (recomendado) — Servidor DICOM open source
2. **REST API** — Conexión directa al equipo de rayos X
3. **File** — Escritura de archivos JSON en carpeta compartida

Configurar en `.env` la variable `DICOM_MODE`.

---

## 📄 Licencia

Uso privado — Centro Diagnóstico Mi Esperanza.
