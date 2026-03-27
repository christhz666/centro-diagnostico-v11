/**
 * Script de Backup Automático de MongoDB
 * Uso: node scripts/backup-mongodb.js
 * 
 * Este script crea backups comprimidos de la base de datos
 * y los guarda en la ruta configurada en BACKUP_DIR
 */

const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

dotenv.config();

// Configuración
const BACKUP_DIR = process.env.BACKUP_DIR || './backups';
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/centro_diagnostico';
const DATE = new Date().toISOString().replace(/[:.]/g, '-').split('T')[0];
const TIMESTAMP = new Date().toISOString().replace(/[:.]/g, '-');

// Extraer nombre de la base de datos del URI
const DB_NAME = MONGODB_URI.split('/').pop() || 'centro_diagnostico';
const BACKUP_FILENAME = `${DB_NAME}_backup_${TIMESTAMP}`;

// Asegurar que el directorio de backups existe
if (!fs.existsSync(BACKUP_DIR)) {
    console.log(`📁 Creando directorio de backups: ${BACKUP_DIR}`);
    fs.mkdirSync(BACKUP_DIR, { recursive: true });
}

console.log('🔄 Iniciando backup de MongoDB...');
console.log(`📊 Base de datos: ${DB_NAME}`);
console.log(`💾 Archivo: ${BACKUP_FILENAME}.gz`);

// Comando mongodump
const dumpCommand = `mongodump --uri="${MONGODB_URI}" --out="${path.join(BACKUP_DIR, BACKUP_FILENAME)}"`;

exec(dumpCommand, (error, stdout, stderr) => {
    if (error) {
        console.error(`❌ Error en mongodump: ${error.message}`);
        console.error(stderr);
        process.exit(1);
    }

    console.log('✅ mongodump completado');

    // Comprimir el backup
    const tarCommand = `tar -czf "${path.join(BACKUP_DIR, BACKUP_FILENAME)}.tar.gz" -C "${BACKUP_DIR}" "${BACKUP_FILENAME}"`;

    exec(tarCommand, (error, stdout, stderr) => {
        if (error) {
            console.error(`❌ Error comprimiendo: ${error.message}`);
            process.exit(1);
        }

        console.log('📦 Backup comprimido exitosamente');

        // Eliminar directorio temporal
        const rmCommand = `rm -rf "${path.join(BACKUP_DIR, BACKUP_FILENAME)}"`;

        exec(rmCommand, () => {
            const backupPath = path.join(BACKUP_DIR, `${BACKUP_FILENAME}.tar.gz`);
            const stats = fs.statSync(backupPath);
            const sizeMB = (stats.size / (1024 * 1024)).toFixed(2);

            console.log(`✨ Backup completado: ${backupPath}`);
            console.log(`📏 Tamaño: ${sizeMB} MB`);

            // Limpieza de backups antiguos (mantener últimos 7 días)
            cleanupOldBackups();

            process.exit(0);
        });
    });
});

/**
 * Elimina backups más antiguos de 7 días
 */
function cleanupOldBackups() {
    const maxAge = 7 * 24 * 60 * 60 * 1000; // 7 días en ms
    const now = Date.now();

    fs.readdir(BACKUP_DIR, (err, files) => {
        if (err) {
            console.warn('⚠️ No se pudo leer directorio de backups para limpieza');
            return;
        }

        files.forEach(file => {
            if (!file.includes('.tar.gz')) return;

            const filePath = path.join(BACKUP_DIR, file);
            fs.stat(filePath, (err, stats) => {
                if (err) return;

                if (now - stats.mtimeMs > maxAge) {
                    fs.unlink(filePath, () => {
                        console.log(`🗑️ Backup antiguo eliminado: ${file}`);
                    });
                }
            });
        });
    });
}
