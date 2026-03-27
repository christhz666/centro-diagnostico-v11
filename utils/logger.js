/**
 * Sistema de Logging Centralizado
 * Uso: const logger = require('./utils/logger');
 * 
 * Niveles: error, warn, info, debug
 */

const fs = require('fs');
const path = require('path');

// Configuración desde .env o valores por defecto
const LOG_LEVEL = process.env.LOG_LEVEL || 'info';
const LOG_DIR = process.env.LOG_DIR || './logs';
const NODE_ENV = process.env.NODE_ENV || 'development';

// Asegurar que el directorio de logs existe
if (!fs.existsSync(LOG_DIR)) {
    try {
        fs.mkdirSync(LOG_DIR, { recursive: true });
        console.log(`📁 Directorio de logs creado: ${LOG_DIR}`);
    } catch (error) {
        console.warn(`⚠️ No se pudo crear directorio de logs: ${error.message}`);
    }
}

// Niveles de log (menor número = más crítico)
const LEVELS = {
    error: 0,
    warn: 1,
    info: 2,
    debug: 3
};

// Color para consola en desarrollo
const COLORS = {
    error: '\x1b[31m', // Rojo
    warn: '\x1b[33m',  // Amarillo
    info: '\x1b[36m',  // Cyan
    debug: '\x1b[35m', // Magenta
    reset: '\x1b[0m'
};

class Logger {
    constructor(service = 'main') {
        this.service = service;
        this.minLevel = LEVELS[LOG_LEVEL] !== undefined ? LEVELS[LOG_LEVEL] : LEVELS.info;
    }

    /**
     * Formatea el mensaje de log
     */
    _formatMessage(level, message, meta = {}) {
        const timestamp = new Date().toISOString();
        const logEntry = {
            timestamp,
            level,
            service: this.service,
            message,
            ...meta
        };

        return JSON.stringify(logEntry);
    }

    /**
     * Escribe el log en archivo y consola
     */
    _log(level, message, meta = {}) {
        // Verificar si el nivel debe ser logueado
        if (LEVELS[level] > this.minLevel) return;

        const logLine = this._formatMessage(level, message, meta);
        const date = new Date().toISOString().split('T')[0];
        const logFile = path.join(LOG_DIR, `${this.service}_${date}.log`);

        // Escribir en archivo
        fs.appendFile(logFile, logLine + '\n', (err) => {
            if (err && NODE_ENV === 'development') {
                console.error('Error escribiendo log:', err);
            }
        });

        // Mostrar en consola (solo en desarrollo o para errores)
        if (NODE_ENV === 'development' || level === 'error') {
            const color = COLORS[level] || COLORS.reset;
            const emoji = {
                error: '❌',
                warn: '⚠️',
                info: 'ℹ️',
                debug: '🐛'
            }[level] || '•';

            console.log(`${color}${emoji} [${timestamp}] [${level.toUpperCase()}] ${message}${COLORS.reset}`);
            
            if (Object.keys(meta).length > 0) {
                console.log(JSON.stringify(meta, null, 2));
            }
        }
    }

    error(message, meta = {}) {
        this._log('error', message, meta);
    }

    warn(message, meta = {}) {
        this._log('warn', message, meta);
    }

    info(message, meta = {}) {
        this._log('info', message, meta);
    }

    debug(message, meta = {}) {
        this._log('debug', message, meta);
    }

    /**
     * Log de inicio de aplicación
     */
    appStart(config = {}) {
        this.info('🚀 Aplicación iniciada', {
            environment: NODE_ENV,
            port: config.port,
            ...config
        });
    }

    /**
     * Log de error de base de datos
     */
    dbError(error, operation = '') {
        this.error('💾 Error de base de datos', {
            operation,
            message: error.message,
            stack: NODE_ENV === 'development' ? error.stack : undefined
        });
    }

    /**
     * Log de petición HTTP
     */
    http(req, statusCode, duration = 0) {
        const level = statusCode >= 400 ? 'warn' : 'debug';
        this._log(level, `${req.method} ${req.originalUrl}`, {
            statusCode,
            duration: `${duration}ms`,
            ip: req.ip,
            user: req.user?._id || 'anonymous'
        });
    }

    /**
     * Log de auditoría (acciones de usuarios)
     */
    audit(user, action, resource, details = {}) {
        this.info('🔍 Auditoría', {
            userId: user._id,
            username: user.username || user.email,
            action,
            resource,
            ...details
        });
    }
}

// Logger por defecto para el servicio principal
const defaultLogger = new Logger('server');

module.exports = Logger;
module.exports.defaultLogger = defaultLogger;
module.exports.logger = defaultLogger;
