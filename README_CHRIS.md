# 🏥 Centro Diagnóstico Mi Esperanza — v11

**README para Chris** — Guía completa de instalación, configuración y funciones del sistema.

---

## 📋 Índice

1. [¿Qué hay de nuevo en v11?](#nuevos)
2. [Requisitos](#requisitos)
3. [Instalación paso a paso](#instalacion)
4. [Configurar variables de entorno (.env)](#env)
5. [Arrancar el servidor](#arrancar)
6. [Frontend (React)](#frontend)
7. [Módulo de Imagenología](#imagenologia)
8. [Integración con equipo de Rayos X — RIS/PACS](#rayosx)
9. [Visor de imágenes para la doctora](#visor)
10. [Plantillas de reportes médicos](#plantillas)
11. [Configuración del Centro (Admin Panel)](#adminpanel)
12. [Sucursales](#sucursales)
13. [Registro de Pacientes](#registro)
14. [Portal del Paciente (QR y Credenciales)](#portal)
15. [LIS ID y Equipos de Laboratorio](#lis)
16. [Tutorial Guiado](#tutorial)
17. [Modo Día / Modo Noche](#tema)
18. [WhatsApp y Contabilidad](#extras)
19. [API Reference — Imagenología](#api)
20. [Solución de problemas](#troubleshooting)

---

## 🆕 ¿Qué hay de nuevo en v11? {#nuevos}

### Correcciones Críticas
- **Configuración del centro ahora guarda correctamente** — logos, nombre, RUC, teléfono, colores se guardan en la base de datos
- **Botón "Recordarme" funciona** — guarda el email del usuario en el navegador para auto-completar en el próximo login
- **Dashboard con contadores reales** — Citas Hoy, Resultados, Ingresos y Pacientes Nuevos muestran datos reales de la base de datos
- **Sidebar completo** — restauradas las opciones de WhatsApp, Contabilidad y Descargas en el menú de Administración
- **Modo Día/Noche mejorado** — AdminPanel, PageTitle y componentes internos respetan el tema oscuro
- **LIS ID = Factura ID** — el ID del paciente en las máquinas de laboratorio ahora coincide con el número de factura
- **Credenciales del portal** — el QR del paciente genera usuario = nombre, contraseña = apellido

### Nuevas Funciones
- **Tutorial guiado** — tour interactivo la primera vez que un usuario entra al sistema
- **Configuración RIS/PACS** — panel configurable para worklist de Rayos X (IP, puerto, AE Title)
- **Registro de pacientes mejorado** — campos de seguro médico, tipo de sangre, sexo, nacionalidad, email
- **Cédula no obligatoria** — si el paciente es menor de 18 años, se marca automáticamente como "Menor de Edad"
- **Tipo de equipo "imagenología"** — para registrar equipos de Rayos X junto a los de laboratorio
- **Gestión de sucursales** — pestaña en el panel de administración para crear y gestionar múltiples sucursales

---

## 💻 Requisitos {#requisitos}

| Software | Versión mínima | Link |
|----------|---------------|------|
| Node.js  | 18 LTS        | https://nodejs.org |
| MongoDB  | 6.0           | https://www.mongodb.com/try/download/community |
| npm      | incluido con Node.js | — |

**Opcional (para integración Rayos X):**
- Orthanc Server: https://www.orthanc-server.com/download.php

---

## 🚀 Instalación paso a paso {#instalacion}

### 1. Clonar el proyecto

```bash
git clone <url-del-repo> centro-diagnostico-v11
cd centro-diagnostico-v11
```

### 2. Instalar dependencias del backend (Node.js)

```bash
npm install
```

Si da error de `serialport`:
```bash
npm install --ignore-scripts
```

### 3. Instalar dependencias del frontend (React)

```bash
cd frontend
npm install
cd ..
```

### 4. Instalar y arrancar MongoDB

**En Ubuntu/Debian:**
```bash
sudo apt update
sudo apt install -y mongodb
sudo systemctl start mongodb
sudo systemctl enable mongodb
```

**En Windows:**
- Descargar e instalar desde https://www.mongodb.com/try/download/community
- Agregar `C:\Program Files\MongoDB\Server\7.0\bin` al PATH

**Verificar MongoDB:**
```bash
mongosh
# Debe mostrar el prompt > si funciona
```

### 5. Crear el archivo .env

```bash
cp .env.example .env
```

Editar `.env` — ver sección [Variables de Entorno](#env).

### 6. Crear el administrador inicial

```bash
node createAdmin.js
```

Anota las credenciales que muestra (email y contraseña).

### 7. Crear carpetas necesarias

```bash
mkdir -p uploads/imagenes uploads/dicom uploads/worklist public
```

### 8. Compilar el frontend para producción

```bash
cd frontend
npm run build
cd ..
```

### 9. Arrancar el servidor

```bash
# Producción (sirve backend + frontend compilado):
node server.js

# Desarrollo (solo backend):
npm run dev

# Frontend en desarrollo (en otra terminal):
cd frontend && npm start
```

Debes ver:
```
+---------------------------------------------------+
¦  Centro Diagnóstico - API Server                 ¦
¦  Host/Puerto: 0.0.0.0:5000                       |
+---------------------------------------------------+
```

### 10. Verificar

- **API:** http://localhost:5000/api/health
- **Frontend (dev):** http://localhost:3000
- **Frontend (producción):** http://localhost:5000

---

## ⚙️ Variables de entorno (.env) {#env}

### Obligatorias

```env
NODE_ENV=production
PORT=5000
MONGODB_URI=mongodb://localhost:27017/centro_diagnostico
JWT_SECRET=clave_secreta_minimo_32_caracteres_aqui
```

### Para acceso remoto / red

```env
HOST=0.0.0.0
CORS_ORIGINS=http://localhost:3000,http://192.168.1.X:3000
PUBLIC_API_URL=http://TU_IP:5000
FRONTEND_URL=http://TU_IP:3000
```

### Para email (notificaciones)

```env
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=correo@gmail.com
EMAIL_PASS=contraseña_de_aplicacion_de_google
```

> ⚠️ En Gmail: activar "Contraseñas de aplicación" en la configuración de seguridad.

### Para integración DICOM / Rayos X

```env
DICOM_MODE=none    # opciones: none, orthanc, rest, file
ORTHANC_URL=http://localhost:8042
ORTHANC_USER=orthanc
ORTHANC_PASS=orthanc
DICOM_WORKLIST_DIR=/ruta/carpeta/compartida
```

---

## 🖥️ Frontend (React) {#frontend}

El frontend está en `frontend/`. Es una aplicación React con Tailwind CSS.

### Desarrollo
```bash
cd frontend
npm start
# Abre http://localhost:3000
```

### Producción
```bash
cd frontend
npm run build
# El build se genera en frontend/build/
# El servidor Express lo sirve automáticamente
```

### Estructura de componentes
| Componente | Descripción |
|-----------|-------------|
| `Login.js` | Pantalla de inicio de sesión con "Recordarme" |
| `Dashboard.js` | Panel principal con estadísticas en tiempo real |
| `RegistroInteligente.js` | Registro de pacientes en 3 pasos |
| `Facturas.js` | Gestión de facturas |
| `Resultados.js` | Resultados de laboratorio |
| `Imagenologia.js` | Visor DICOM y reportes de imágenes |
| `AdminPanel.js` | Configuración del centro (logos, colores, datos) |
| `AdminEquipos.js` | Equipos LIS + configuración RIS/PACS |
| `AdminUsuarios.js` | Gestión de usuarios y roles |
| `AdminSucursales.js` | Gestión de sucursales |
| `Contabilidad.js` | Módulo contable |
| `CampanaWhatsApp.js` | Campañas de WhatsApp |
| `DescargarApp.js` | Descarga de aplicaciones |

---

## 🏗️ Configuración del Centro (Admin Panel) {#adminpanel}

Acceder desde: **Administración → Configuración**

### Datos de la Empresa
- Nombre, RNC/RUC, Teléfono, Email, Dirección
- Se guardan con el botón "Guardar Configuración"

### Logos del Sistema
- **Logo de Login** — aparece en la pantalla de inicio
- **Logo de Facturas** — se imprime en cada factura térmica
- **Logo de Resultados** — en reportes de laboratorio e imagenología
- **Logo de Sidebar** — en el menú lateral

Formatos: PNG, JPG, SVG, WebP. Se almacenan como base64 en la BD.

### Colores del Sistema
- Color Primario (botones, links)
- Color Secundario (sidebar, encabezados)
- Color de Acento (ítem activo del menú)

---

## 🏢 Sucursales {#sucursales}

Acceder desde: **Administración → Configuración → Pestaña "Gestión de Sucursales"**

Cada sucursal tiene:
- Nombre, dirección, teléfono, email
- Estado (activa/inactiva)
- Los datos de pacientes, facturas y citas se filtran por sucursal

---

## 📝 Registro de Pacientes {#registro}

Acceder desde: **Registro** en el menú lateral.

### Campos disponibles
| Campo | Obligatorio | Notas |
|-------|:-----------:|-------|
| Nombre | ✅ | |
| Apellido | ✅ | |
| Fecha de Nacimiento | ✅ | Si < 18 años: marca automática de "Menor de Edad" |
| Sexo | ✅ | Masculino / Femenino |
| Teléfono | ✅ | |
| Cédula / ID | ❌ | No obligatorio. Auto-rellena "MENOR DE EDAD" para menores |
| Email | ❌ | |
| Nacionalidad | ❌ | Dominicano, Haitiano, Otro |
| Tipo de Sangre | ❌ | A+, A-, B+, B-, AB+, AB-, O+, O- |
| Seguro Médico | ❌ | Nombre del seguro + número de afiliado |

### Flujo de registro
1. **Paso 1 — Identificación:** Buscar paciente existente o crear nuevo
2. **Paso 2 — Servicios Médicos:** Seleccionar estudios del catálogo
3. **Paso 3 — Liquidación:** Método de pago y monto recibido

---

## 📱 Portal del Paciente — QR y Credenciales {#portal}

Cada factura genera automáticamente:
- **Código QR único** — el paciente lo escanea para acceder al portal
- **Usuario:** nombre del paciente (en minúsculas, sin espacios)
- **Contraseña:** apellido del paciente (en minúsculas, sin espacios)

Ejemplo: Paciente "Juan Pérez" → usuario: `juan`, contraseña: `perez`

Estas credenciales se imprimen en la factura térmica.

---

## 🔬 LIS ID y Equipos de Laboratorio {#lis}

### ID unificado
El **código LIS** (ID que se envía a las máquinas de laboratorio) ahora coincide con el **número de factura**. Si la factura es `FAC-000007`, el LIS ID es `7`.

Esto evita confusiones: el paciente tiene un solo ID en todo el sistema.

### Configuración de equipos
Acceder desde: **Administración → Equipos**

- Crear equipos (Mindray, Siemens, etc.)
- Configurar protocolo: ASTM, HL7, TCP, SERIAL, FILE
- Configurar conexión: IP + Puerto, Puerto COM, carpeta de archivos
- Tipos: hematología, química, orina, coagulación, inmunología, microbiología, **imagenología**, otro

### Configuración RIS / Worklist / PACS
En la parte inferior de la página de Equipos:

- **RIS-IN (Worklist):** Configura IP y puerto del módulo que envía la worklist al equipo de Rayos X
- **PACS (Imágenes):** Configura IP, puerto y AE Title del servidor PACS (Orthanc)

Ambos módulos se pueden habilitar/deshabilitar individualmente.

---

## 🎓 Tutorial Guiado {#tutorial}

La primera vez que un usuario inicia sesión, aparece un **tour interactivo** que explica:
1. Menú de navegación
2. Dashboard y estadísticas
3. Registro de pacientes
4. Consulta rápida
5. Resultados de laboratorio
6. Visor de imágenes

El tour solo aparece **una vez por usuario**. Se puede saltar en cualquier momento.

---

## 🌙 Modo Día / Modo Noche {#tema}

Click en el ícono ☀️/🌙 en la esquina superior derecha del header.

- Se guarda en `localStorage` y persiste entre sesiones
- Los componentes principales (Dashboard, AdminPanel, Sidebar, Login) respetan el tema
- Si es la primera vez, se usa la preferencia del sistema operativo

---

## 💬 WhatsApp y Contabilidad {#extras}

### WhatsApp
Acceder desde: **Administración → WhatsApp**

Requiere configurar Twilio en `.env`:
```env
TWILIO_ACCOUNT_SID=tu_sid
TWILIO_AUTH_TOKEN=tu_token
TWILIO_WHATSAPP_FROM=whatsapp:+14155238886
```

### Contabilidad
Acceder desde: **Administración → Contabilidad**

Módulo contable con:
- Registro de movimientos (ingresos/egresos)
- Resumen diario
- Flujo de caja

---

## 📡 Integración con equipo de Rayos X {#rayosx}

### El problema que resuelve
Antes: registrabas al paciente → lo tenías que registrar **otra vez** en el equipo de Rayos X.
**Ahora:** al crear una cita con estudios de imágenes, el sistema envía automáticamente los datos.

### Opción A: Orthanc (Recomendada)

```env
DICOM_MODE=orthanc
ORTHANC_URL=http://localhost:8042
ORTHANC_USER=orthanc
ORTHANC_PASS=orthanc
```

En el equipo de Rayos X, configurar DICOM Worklist apuntando a la IP del servidor, puerto 4242, AET: `ORTHANC`.

### Opción B: Carpeta compartida

```env
DICOM_MODE=file
DICOM_WORKLIST_DIR=/ruta/carpeta/compartida
```

### Opción C: Sin integración

```env
DICOM_MODE=none
```

### Configuración RIS/PACS desde el panel web
En **Administración → Equipos**, sección "Configuración RIS / Worklist / PACS":
- Configurar IP y puerto del módulo RIS-IN
- Configurar IP, puerto y AE Title del PACS
- Guardar con el botón "Guardar Configuración RIS/PACS"

---

## 🖼️ Visor de imágenes {#visor}

### Controles
| Control | Descripción |
|---------|-------------|
| Brillo | -100 a +100 |
| Contraste | -100 a +100 |
| Saturación | -100 a +100 |
| Zoom | 0.1x a 5x (slider + rueda del mouse) |
| Rotación | -90° / +90° |
| Voltear | Horizontal / Vertical |
| Invertir | Negativo (útil en Rayos X) |

### Presets
Normal, Hueso, Pulmones, Tejidos, Negativo

---

## 📋 Plantillas de reportes {#plantillas}

| Plantilla | Campos especiales |
|-----------|-----------------|
| Radiografía General | Técnica, Hallazgos, Impresión, Recomendaciones |
| Tórax | + Campos pulmonares, Silueta cardiaca, Mediastino |
| Columna | + Alineación, Cuerpos vertebrales, Espacios discales |
| Extremidades | + Estructuras óseas, Articulaciones |
| Abdomen | + Distribución gaseosa, Solidificaciones |
| Mamografía | + Densidad mamaria, Masas, BIRADS |
| Personalizada | Campos básicos |

---

## 🔌 API Reference — Imagenología {#api}

Todos requieren `Authorization: Bearer TOKEN`.

```
GET  /api/imagenologia/plantillas          — Plantillas (sin auth)
GET  /api/imagenologia/workspace/:id       — Workspace del visor
PUT  /api/imagenologia/workspace/:id       — Guardar ajustes/reporte
POST /api/imagenologia/upload/:id          — Subir imágenes (multipart)
DELETE /api/imagenologia/imagen/:rid/:iid  — Eliminar imagen
GET  /api/imagenologia/lista               — Lista de estudios
POST /api/imagenologia/reporte/:id/finalizar — Finalizar reporte
GET  /api/imagenologia/worklist/:citaId    — Worklist DICOM/HL7/JSON
```

---

## 🔧 Solución de problemas {#troubleshooting}

### El servidor no arranca
```bash
node server.js
# "Cannot find module 'serialport'" → npm install --ignore-scripts
# "EADDRINUSE 5000" → cambiar PORT en .env
# "MongooseServerSelectionError" → MongoDB no está corriendo
```

### MongoDB no conecta
```bash
sudo systemctl status mongodb    # Linux
net start MongoDB                # Windows
```

### El visor no carga imágenes
- Verificar que `uploads/imagenes` existe y tiene permisos
- Probar: http://localhost:5000/uploads/

### Error 413 al subir imágenes
Si hay nginx delante:
```nginx
client_max_body_size 100M;
```

### Configuración no guarda
- Verificar que estás logueado como **admin**
- Verificar la consola del navegador (F12) para errores de red
- El endpoint es `PUT /api/configuracion/` — requiere rol admin

---

## 📁 Estructura del proyecto

```
centro-diagnostico-v11/
├── server.js              ← Servidor Express (backend + frontend)
├── config/db.js           ← Conexión MongoDB
├── models/                ← Mongoose schemas (Paciente, Factura, etc.)
├── controllers/           ← Lógica de negocio
├── routes/                ← Endpoints API
├── middleware/             ← Auth, errores, validación, sucursal
├── services/              ← DICOM, Orthanc, equipos
├── frontend/              ← React app
│   ├── src/components/    ← Componentes UI
│   ├── src/services/api.js ← Cliente API
│   └── public/            ← Assets estáticos
├── uploads/               ← Imágenes, DICOM, worklist
├── public/                ← Visor HTML
├── whatsapp/              ← Módulo WhatsApp
├── agentes/               ← Agentes de laboratorio
├── .env.example           ← Plantilla de variables
├── createAdmin.js         ← Crear usuario admin
├── package.json           ← Dependencias Node
└── README_CHRIS.md        ← Este archivo
```

---

## 🆘 Contacto y soporte

Para problemas, reportar con:
1. Sistema operativo
2. `node -v` y `mongod --version`
3. El error completo de la consola
4. Capturas de pantalla si es un error visual

---

*Centro Diagnóstico Mi Esperanza — v11.0 | Generado con asistencia de IA*
