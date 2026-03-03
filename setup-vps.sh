#!/bin/bash
# ============================================================
#  Centro Diagnóstico Mi Esperanza — Instalador VPS
#  Compatible: Oracle Linux 7/8/9, CentOS 7/8, RHEL, Ubuntu
#  
#  USO:  chmod +x setup-vps.sh && sudo ./setup-vps.sh
#
#  Este script SOLO instala dependencias del sistema.
#  NO crea ni edita archivos del proyecto.
# ============================================================

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

log()   { echo -e "${GREEN}[✔]${NC} $1"; }
warn()  { echo -e "${YELLOW}[⚠]${NC} $1"; }
err()   { echo -e "${RED}[✘]${NC} $1"; }
info()  { echo -e "${CYAN}[→]${NC} $1"; }

echo ""
echo -e "${CYAN}╔══════════════════════════════════════════════════╗${NC}"
echo -e "${CYAN}║  Centro Diagnóstico Mi Esperanza — Setup VPS    ║${NC}"
echo -e "${CYAN}╚══════════════════════════════════════════════════╝${NC}"
echo ""

# ── Detectar OS ──
if [ -f /etc/os-release ]; then
    . /etc/os-release
    OS_ID="$ID"
    OS_VERSION="$VERSION_ID"
else
    err "No se pudo detectar el sistema operativo"
    exit 1
fi

info "Sistema detectado: $OS_ID $OS_VERSION"

# Detectar gestor de paquetes
if command -v dnf &>/dev/null; then
    PKG="dnf"
elif command -v yum &>/dev/null; then
    PKG="yum"
elif command -v apt-get &>/dev/null; then
    PKG="apt-get"
else
    err "No se encontró gestor de paquetes compatible (dnf/yum/apt)"
    exit 1
fi

info "Gestor de paquetes: $PKG"
echo ""

# ============================================================
#  1. ACTUALIZAR SISTEMA
# ============================================================
echo -e "${CYAN}── 1/8 Actualizando sistema ──${NC}"
if [ "$PKG" = "apt-get" ]; then
    apt-get update -y && apt-get upgrade -y
else
    $PKG update -y
fi
log "Sistema actualizado"

# ============================================================
#  2. HERRAMIENTAS BÁSICAS
# ============================================================
echo ""
echo -e "${CYAN}── 2/8 Instalando herramientas básicas ──${NC}"
if [ "$PKG" = "apt-get" ]; then
    apt-get install -y curl wget git unzip htop nano lsof net-tools
else
    $PKG install -y curl wget git unzip htop nano lsof net-tools
fi
log "Herramientas básicas instaladas"

# ============================================================
#  3. NODE.JS v20 LTS
# ============================================================
echo ""
echo -e "${CYAN}── 3/8 Instalando Node.js v20 LTS ──${NC}"
if command -v node &>/dev/null; then
    NODE_VER=$(node -v)
    warn "Node.js ya está instalado: $NODE_VER"
    # Verificar versión mínima
    NODE_MAJOR=$(echo "$NODE_VER" | sed 's/v//' | cut -d. -f1)
    if [ "$NODE_MAJOR" -lt 18 ]; then
        warn "Versión muy antigua, actualizando..."
        if [ "$PKG" = "apt-get" ]; then
            curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
            apt-get install -y nodejs
        else
            curl -fsSL https://rpm.nodesource.com/setup_20.x | bash -
            $PKG install -y nodejs
        fi
    fi
else
    if [ "$PKG" = "apt-get" ]; then
        curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
        apt-get install -y nodejs
    else
        curl -fsSL https://rpm.nodesource.com/setup_20.x | bash -
        $PKG install -y nodejs
    fi
fi
log "Node.js: $(node -v)"
log "npm: $(npm -v)"

# ============================================================
#  4. PM2 (Gestor de procesos)
# ============================================================
echo ""
echo -e "${CYAN}── 4/8 Instalando PM2 ──${NC}"
if command -v pm2 &>/dev/null; then
    warn "PM2 ya está instalado: $(pm2 -v)"
else
    npm install -g pm2
fi
log "PM2: $(pm2 -v)"

# ============================================================
#  5. MONGODB
# ============================================================
echo ""
echo -e "${CYAN}── 5/8 Instalando MongoDB ──${NC}"
if command -v mongod &>/dev/null || command -v mongosh &>/dev/null; then
    warn "MongoDB ya está instalado"
else
    if [ "$PKG" = "apt-get" ]; then
        # Ubuntu/Debian
        curl -fsSL https://www.mongodb.org/static/pgp/server-7.0.asc | gpg --dearmor -o /usr/share/keyrings/mongodb-server-7.0.gpg
        echo "deb [ signed-by=/usr/share/keyrings/mongodb-server-7.0.gpg ] https://repo.mongodb.org/apt/ubuntu $(lsb_release -cs)/mongodb-org/7.0 multiverse" > /etc/apt/sources.list.d/mongodb-org-7.0.list
        apt-get update
        apt-get install -y mongodb-org
    else
        # Oracle Linux / CentOS / RHEL
        cat > /etc/yum.repos.d/mongodb-org-7.0.repo << 'MONGOREPO'
[mongodb-org-7.0]
name=MongoDB Repository
baseurl=https://repo.mongodb.org/yum/redhat/$releasever/mongodb-org/7.0/x86_64/
gpgcheck=1
enabled=1
gpgkey=https://www.mongodb.org/static/pgp/server-7.0.asc
MONGOREPO
        $PKG install -y mongodb-org
    fi
fi

# Iniciar y habilitar MongoDB
if systemctl is-active --quiet mongod 2>/dev/null; then
    log "MongoDB ya está corriendo"
else
    systemctl enable mongod 2>/dev/null || true
    systemctl start mongod 2>/dev/null || true
    if systemctl is-active --quiet mongod 2>/dev/null; then
        log "MongoDB iniciado correctamente"
    else
        warn "MongoDB instalado pero no se pudo iniciar automáticamente"
        warn "Puede que necesites configurarlo manualmente o usar MongoDB Atlas"
    fi
fi

# ============================================================
#  6. NGINX (Reverse Proxy)
# ============================================================
echo ""
echo -e "${CYAN}── 6/8 Instalando Nginx ──${NC}"
if command -v nginx &>/dev/null; then
    warn "Nginx ya está instalado"
else
    if [ "$PKG" = "apt-get" ]; then
        apt-get install -y nginx
    else
        $PKG install -y nginx
    fi
fi

systemctl enable nginx 2>/dev/null || true
systemctl start nginx 2>/dev/null || true
log "Nginx instalado y activo"

# ============================================================
#  7. CERTBOT (SSL Gratuito)
# ============================================================
echo ""
echo -e "${CYAN}── 7/8 Instalando Certbot (SSL) ──${NC}"
if command -v certbot &>/dev/null; then
    warn "Certbot ya está instalado"
else
    if [ "$PKG" = "apt-get" ]; then
        apt-get install -y certbot python3-certbot-nginx
    else
        $PKG install -y certbot python3-certbot-nginx || {
            # Fallback para Oracle Linux
            $PKG install -y epel-release 2>/dev/null || true
            $PKG install -y certbot python3-certbot-nginx 2>/dev/null || {
                warn "No se pudo instalar Certbot automáticamente"
                warn "Instalar manualmente: pip3 install certbot certbot-nginx"
            }
        }
    fi
fi
log "Certbot listo (usar: sudo certbot --nginx -d tudominio.com)"

# ============================================================
#  8. FIREWALL
# ============================================================
echo ""
echo -e "${CYAN}── 8/8 Configurando Firewall ──${NC}"

# iptables
if command -v firewall-cmd &>/dev/null; then
    firewall-cmd --permanent --add-service=http 2>/dev/null || true
    firewall-cmd --permanent --add-service=https 2>/dev/null || true
    firewall-cmd --reload 2>/dev/null || true
    log "Firewalld: puertos 80/443 abiertos"
elif command -v ufw &>/dev/null; then
    ufw allow 80/tcp 2>/dev/null || true
    ufw allow 443/tcp 2>/dev/null || true
    log "UFW: puertos 80/443 abiertos"
else
    # iptables directo
    iptables -I INPUT -p tcp --dport 80 -j ACCEPT 2>/dev/null || true
    iptables -I INPUT -p tcp --dport 443 -j ACCEPT 2>/dev/null || true
    warn "iptables: puertos 80/443 abiertos (sin persistencia)"
fi

# Oracle Cloud — abrir puertos en iptables de OCI
if iptables -L INPUT -n 2>/dev/null | grep -q "REJECT.*tcp"; then
    info "Detectada regla REJECT de Oracle Cloud, abriendo puertos..."
    iptables -I INPUT 1 -p tcp --dport 80 -j ACCEPT 2>/dev/null || true
    iptables -I INPUT 1 -p tcp --dport 443 -j ACCEPT 2>/dev/null || true
    # Persistir
    if command -v netfilter-persistent &>/dev/null; then
        netfilter-persistent save 2>/dev/null || true
    fi
    log "Reglas de Oracle Cloud actualizadas"
fi

# ============================================================
#  RESUMEN
# ============================================================
echo ""
echo -e "${CYAN}╔══════════════════════════════════════════════════╗${NC}"
echo -e "${CYAN}║              INSTALACIÓN COMPLETADA              ║${NC}"
echo -e "${CYAN}╚══════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "  ${GREEN}Node.js:${NC}    $(node -v 2>/dev/null || echo 'NO INSTALADO')"
echo -e "  ${GREEN}npm:${NC}        $(npm -v 2>/dev/null || echo 'NO INSTALADO')"
echo -e "  ${GREEN}PM2:${NC}        $(pm2 -v 2>/dev/null || echo 'NO INSTALADO')"
echo -e "  ${GREEN}MongoDB:${NC}    $(mongod --version 2>/dev/null | head -1 || echo 'NO INSTALADO')"
echo -e "  ${GREEN}Nginx:${NC}      $(nginx -v 2>&1 | sed 's/nginx version: //' || echo 'NO INSTALADO')"
echo -e "  ${GREEN}Certbot:${NC}    $(certbot --version 2>/dev/null || echo 'NO INSTALADO')"
echo -e "  ${GREEN}Git:${NC}        $(git --version 2>/dev/null || echo 'NO INSTALADO')"
echo ""
echo -e "${YELLOW}═══ PASOS SIGUIENTES ═══${NC}"
echo ""
echo -e "  ${CYAN}1.${NC} Ir a la carpeta del proyecto:"
echo -e "     cd /ruta/a/centro-diagnostico-v11"
echo ""
echo -e "  ${CYAN}2.${NC} Instalar dependencias del backend:"
echo -e "     npm install"
echo ""
echo -e "  ${CYAN}3.${NC} Instalar dependencias del frontend:"
echo -e "     cd frontend && npm install && npm run build && cd .."
echo ""
echo -e "  ${CYAN}4.${NC} Crear archivo .env (copiar de la guía):"
echo -e "     nano .env"
echo ""
echo -e "  ${CYAN}5.${NC} Configurar Nginx:"
echo -e "     sudo nano /etc/nginx/conf.d/centro-diagnostico.conf"
echo -e "     (copiar la config de la guía, cambiar tudominio.com)"
echo ""
echo -e "  ${CYAN}6.${NC} SSL gratuito:"
echo -e "     sudo certbot --nginx -d tudominio.com"
echo ""
echo -e "  ${CYAN}7.${NC} Iniciar la app:"
echo -e "     pm2 start server.js --name centro-diagnostico"
echo -e "     pm2 startup && pm2 save"
echo ""
echo -e "${GREEN}¡Todo listo! 🚀${NC}"
echo ""
